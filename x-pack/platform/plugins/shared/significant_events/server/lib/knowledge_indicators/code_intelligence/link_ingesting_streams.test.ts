/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Feature } from '@kbn/significant-events-schema';
import type { KIBulkOperation, KnowledgeIndicatorClient } from '../knowledge_indicator_client';
import { getCodePredictiveSourceId } from './identify_code_features';
import {
  linkServiceEntities,
  resolveSignalStreams,
  serviceEntityConfidence,
  type ServiceCodeMetadata,
  type StreamSamplingSource,
} from './link_ingesting_streams';

const SPACE_ID = 'default';
const LOG_SOURCE_ID = getCodePredictiveSourceId(SPACE_ID, 'logs');

const STREAMS: StreamSamplingSource[] = [
  { name: 'logs.otel', index: 'logs.otel', convention: 'otel' },
  { name: 'logs.ecs', index: 'logs.ecs', convention: 'ecs' },
];

const createKiClient = (featuresByStream: Record<string, Feature[]> = {}) => {
  const bulk = jest.fn<Promise<{ applied: number }>, [string, KIBulkOperation[]]>(async () => ({
    applied: 1,
  }));
  const kiClient = {
    getFeatures: jest.fn(async (stream: string) => ({ hits: featuresByStream[stream] ?? [] })),
    bulk,
  } as unknown as KnowledgeIndicatorClient;
  return { kiClient, bulk };
};

const link = async (
  metadata: ServiceCodeMetadata | undefined,
  featuresByStream: Record<string, Feature[]> = {},
  streams: StreamSamplingSource[] = STREAMS
) => {
  const { kiClient, bulk } = createKiClient(featuresByStream);
  const result = await linkServiceEntities({
    serviceName: 'checkout',
    repository: 'acme/checkout',
    fingerprint: 'abc123',
    metadata,
    spaceId: SPACE_ID,
    kiClient,
    runId: 'run-1',
    logger: loggerMock.create(),
    beforeWrite: jest.fn().mockResolvedValue(undefined),
  });
  return { result, bulk };
};

describe('resolveSignalStreams', () => {
  it('probes Query Stream ES|QL views instead of index-only APIs', async () => {
    const esql = jest.fn(async ({ query }: { query: string }) => ({
      columns: [],
      values: query.includes('$.cps-traces') ? [[1]] : [],
    }));
    const esClient = {
      esql: { query: esql },
      count: jest.fn(),
      fieldCaps: jest.fn(),
    } as unknown as ElasticsearchClient;

    const result = await resolveSignalStreams({
      streams: [
        {
          name: 'cps.traces',
          index: '$.cps-traces',
          convention: 'otel',
          isQueryStream: true,
        },
      ],
      esClient,
      logger: loggerMock.create(),
    });

    expect(result.traceStreams).toEqual(['$.cps-traces']);
    expect(result.traceStreamNames).toEqual(['cps.traces']);
    expect(esql).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM $.cps-traces | LIMIT 1' })
    );
    expect(esClient.count).not.toHaveBeenCalled();
    expect(esClient.fieldCaps).not.toHaveBeenCalled();
  });

  it('resolves non-empty trace/metric/log streams and excludes empty logs', async () => {
    const esClient = {
      fieldCaps: jest.fn(async () => ({
        fields: { message: { keyword: { type: 'keyword', searchable: true } } },
      })),
      count: jest.fn(async ({ index }: { index: string }) => ({
        count: index === 'logs.ecs' ? 0 : 1,
      })),
    } as unknown as ElasticsearchClient;
    const result = await resolveSignalStreams({
      streams: [
        { name: 'traces.otel', index: 'traces-generic.otel-default', convention: 'otel' },
        { name: 'metrics.otel', index: 'metrics-generic.otel-default', convention: 'otel' },
        { name: 'logs.otel', index: 'logs-generic.otel-default', convention: 'otel' },
        { name: 'logs.ecs', index: 'logs.ecs', convention: 'ecs' },
      ],
      esClient,
      logger: loggerMock.create(),
    });
    expect(result).toEqual({
      traceStreams: ['traces-generic.otel-default'],
      metricStreams: ['metrics-generic.otel-default'],
      logStreams: ['logs-generic.otel-default'],
      traceStreamNames: ['traces.otel'],
      metricStreamNames: ['metrics.otel'],
      logStreamNames: ['logs.otel'],
    });
  });
});

describe('linkServiceEntities', () => {
  it('calibrates confidence and persists code-derived service metadata', async () => {
    const inferred = { environmentVariables: ['PORT=3000'] };
    const grounded = {
      environmentVariables: ['OTEL_SERVICE_NAME=checkout'],
      serviceRoot: 'services/checkout',
      iacSignals: [{ kind: 'kubernetes', path: 'services/checkout/deployment.yaml' }],
      gitSha: 'abc123',
    } satisfies ServiceCodeMetadata;

    expect(serviceEntityConfidence(grounded)).toBeGreaterThan(serviceEntityConfidence(inferred));
    expect(serviceEntityConfidence(inferred)).toBeLessThan(100);

    const { bulk } = await link(grounded);
    const operation = bulk.mock.calls[0][1][0] as { index: { feature: Feature } };
    const feature = operation.index.feature;
    expect(feature.confidence).toBe(serviceEntityConfidence(grounded));
    expect(feature.properties).toMatchObject({
      service_root: 'services/checkout',
      iac_signals: [{ kind: 'kubernetes', path: 'services/checkout/deployment.yaml' }],
      git_sha: 'abc123',
    });
  });

  it('always targets the space-scoped predictive logs source', async () => {
    const { result, bulk } = await link({ loggingPattern: 'otel' });
    expect(result.streams).toEqual([LOG_SOURCE_ID]);
    expect(bulk).toHaveBeenCalledWith(
      LOG_SOURCE_ID,
      expect.arrayContaining([
        expect.objectContaining({
          index: expect.objectContaining({
            feature: expect.objectContaining({ source_ids: [LOG_SOURCE_ID] }),
          }),
        }),
      ])
    );
  });

  it('keeps telemetry metadata and real bindings from changing ownership', async () => {
    const { result } = await link({ loggingPattern: 'otel' }, {}, [
      { name: 'logs.ecs', index: 'logs.ecs', convention: 'ecs' },
    ]);
    expect(result.streams).toEqual([LOG_SOURCE_ID]);
  });

  it('merges with a matching entity on the predictive owner', async () => {
    const matchingLogEntity = {
      id: 'checkout',
      uuid: 'checkout-uuid',
      stream_name: LOG_SOURCE_ID,
      source_ids: [LOG_SOURCE_ID],
      type: 'entity',
      subtype: 'service',
      title: 'checkout',
      description: 'Observed in logs',
      properties: { name: 'checkout' },
      confidence: 80,
      evidence: ['logs: checkout observed'],
    } satisfies Feature;
    const { result } = await link(
      { loggingPattern: 'otel' },
      { [LOG_SOURCE_ID]: [matchingLogEntity] }
    );
    expect(result.streams).toEqual([LOG_SOURCE_ID]);
  });
});
