/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Command, getCurrentTaskInput } from '@langchain/langgraph';
import type { ToolMessage } from '@langchain/core/messages';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server';
import { ingestPipelineValidatorTool } from './ingest_pipeline_validator';
import { BOILERPLATE_PIPELINE } from './pipeline_constants';

jest.mock('@langchain/langgraph', () => ({
  ...jest.requireActual('@langchain/langgraph'),
  getCurrentTaskInput: jest.fn(),
}));

const mockedGetCurrentTaskInput = getCurrentTaskInput as jest.Mock;

const buildFieldsMetadataClient = (ecsFields: Record<string, string>): IFieldsMetadataClient =>
  ({
    find: jest.fn().mockImplementation(async ({ fieldNames }: { fieldNames?: string[] }) => ({
      getFields: () =>
        Object.fromEntries(
          (fieldNames ?? Object.keys(ecsFields))
            .filter((name) => name in ecsFields)
            .map((name) => [name, { name, type: ecsFields[name] }])
        ),
    })),
    getECSFieldsets: jest
      .fn()
      .mockResolvedValue(['event', 'source', 'vulnerability', 'dns', 'network']),
    getByName: jest.fn().mockResolvedValue({
      pick: () => ({ allowed_values: [{ name: 'event' }] }),
    }),
    matchesAnyTypeForEventCategory: jest.fn().mockResolvedValue(true),
  } as unknown as IFieldsMetadataClient);

const buildEsClient = (sources: Array<Record<string, unknown>>): ElasticsearchClient =>
  ({
    ingest: {
      simulate: jest.fn().mockResolvedValue({
        docs: sources.map((source) => ({ doc: { _source: source } })),
      }),
    },
  } as unknown as ElasticsearchClient);

const runValidator = async (
  sources: Array<Record<string, unknown>>,
  fieldsMetadataClient?: IFieldsMetadataClient
) => {
  mockedGetCurrentTaskInput.mockReturnValue({ current_pipeline: BOILERPLATE_PIPELINE });

  const tool = ingestPipelineValidatorTool({
    esClient: buildEsClient(sources),
    samples: sources.map((_, index) => `sample ${index}`),
    packageName: 'myint',
    dataStreamName: 'myds',
    fieldsMetadataClient:
      fieldsMetadataClient ??
      buildFieldsMetadataClient({
        '@timestamp': 'date',
        'event.kind': 'keyword',
        'source.ip': 'ip',
        'source.geo.location': 'geo_point',
        'dns.answers': 'nested',
        'dns.answers.name': 'keyword',
        'network.inner': 'object',
        'network.inner.vlan.id': 'keyword',
        labels: 'object',
      }),
  });

  const result = await tool.invoke({});

  expect(result).toBeInstanceOf(Command);
  const { messages } = (result as Command).update as { messages: ToolMessage[] };
  return JSON.parse(messages[0].content as string) as {
    field_naming_errors?: string[];
    ecs_warnings?: string[];
  };
};

describe('ingestPipelineValidatorTool', () => {
  it('reports custom fields that are not snake_case as field naming errors', async () => {
    const response = await runValidator([
      { '@timestamp': '2026-01-01T00:00:00Z', myint: { myds: { evaluatorImpact: 'high' } } },
    ]);

    expect(response.field_naming_errors).toEqual([
      expect.stringContaining("'myint.myds.evaluator_impact'"),
    ]);
  });

  it('reports non snake_case names inside arrays of objects', async () => {
    const response = await runValidator([
      {
        '@timestamp': '2026-01-01T00:00:00Z',
        myint: { myds: { items: [{ evaluatorImpact: 'high' }] } },
      },
    ]);

    expect(response.field_naming_errors).toEqual([
      expect.stringContaining("'myint.myds.items.evaluator_impact'"),
    ]);
  });

  it('treats an array of geo_point objects as a single ECS field', async () => {
    const response = await runValidator([
      {
        '@timestamp': '2026-01-01T00:00:00Z',
        source: { geo: { location: [{ lat: 40, lon: -70 }] } },
      },
    ]);

    expect(response.field_naming_errors).toBeUndefined();
  });

  it('treats a geo_point object as a single ECS field', async () => {
    const response = await runValidator([
      {
        '@timestamp': '2026-01-01T00:00:00Z',
        source: { geo: { location: { lat: 40, lon: -70 } } },
      },
    ]);

    expect(response.field_naming_errors).toBeUndefined();
  });

  it('allows arbitrary keys under an ECS object field such as labels', async () => {
    const response = await runValidator([
      { '@timestamp': '2026-01-01T00:00:00Z', labels: { env: 'prod', Region: 'eu' } },
    ]);

    expect(response.field_naming_errors).toBeUndefined();
  });

  it('still validates children of ECS nested arrays such as dns.answers', async () => {
    const response = await runValidator([
      {
        '@timestamp': '2026-01-01T00:00:00Z',
        dns: { answers: [{ name: 'example.org', vendorField: 'x' }] },
      },
    ]);

    expect(response.field_naming_errors).toEqual([
      expect.stringContaining("Field 'dns.answers.vendorField' is under ECS root 'dns'"),
    ]);
  });

  it('validates children of an ECS object whose ECS children are only defined deeper', async () => {
    const response = await runValidator([
      { '@timestamp': '2026-01-01T00:00:00Z', network: { inner: { vendorField: 'x' } } },
    ]);

    expect(response.field_naming_errors).toEqual([
      expect.stringContaining("Field 'network.inner.vendorField' is under ECS root 'network'"),
    ]);
  });

  it('still reports naming errors when the ECS metadata lookup fails', async () => {
    const failingClient = {
      find: jest.fn().mockRejectedValue(new Error('metadata down')),
      getECSFieldsets: jest.fn().mockRejectedValue(new Error('metadata down')),
      getByName: jest.fn().mockRejectedValue(new Error('metadata down')),
    } as unknown as IFieldsMetadataClient;

    const response = await runValidator(
      [{ '@timestamp': '2026-01-01T00:00:00Z', myint: { myds: { evaluatorImpact: 'high' } } }],
      failingClient
    );

    expect(response.ecs_warnings).toEqual([expect.stringContaining('ECS validation unavailable')]);
    expect(response.field_naming_errors).toEqual([
      expect.stringContaining("'myint.myds.evaluator_impact'"),
    ]);
  });

  it('still reports custom fields placed under an ECS root', async () => {
    const response = await runValidator([
      { '@timestamp': '2026-01-01T00:00:00Z', vulnerability: { cisa_notes: 'x' } },
    ]);

    expect(response.field_naming_errors).toEqual([
      expect.stringContaining("under ECS root 'vulnerability'"),
    ]);
  });

  it('reports no field naming errors for ECS fields and snake_case custom fields', async () => {
    const response = await runValidator([
      {
        '@timestamp': '2026-01-01T00:00:00Z',
        source: { ip: '10.0.0.1' },
        myint: { myds: { src_port: 443 } },
      },
    ]);

    expect(response.field_naming_errors).toBeUndefined();
  });
});
