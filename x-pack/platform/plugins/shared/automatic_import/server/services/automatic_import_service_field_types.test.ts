/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import type { AnalyticsServiceSetup, CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { AutomaticImportService } from './automatic_import_service';
import type { AutomaticImportPluginStartDependencies } from '../types';
import { FieldTypesLockedError, InvalidFieldTypeChangeError } from '../errors';
import { validateFieldMappings } from './build_integration/validate_fields';

jest.mock('./samples_index/index_service', () => ({
  AutomaticImportSamplesIndexService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    getSamplesForDataStream: jest.fn(),
  })),
}));

jest.mock('./build_integration/validate_fields', () => ({
  validateFieldMappings: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
}));

type Doc = Record<string, unknown>;

const PARSED_SAMPLES: Doc[] = [
  { port: '443', code: 200, when: '2024-01-01T00:00:00Z', label: 'a' },
  { port: 'abc', code: 300, when: 'March 5', label: 'b' },
];

const fakeSimulate = () => ({
  docs: PARSED_SAMPLES.map((source) => ({ doc: { _source: { ...source } } })),
});

describe('AutomaticImportService field types', () => {
  let service: AutomaticImportService;
  let savedObjectService: Record<string, jest.Mock>;
  let samplesIndexService: { getSamplesForDataStream: jest.Mock };
  let esClient: { ingest: { simulate: jest.Mock } };
  let dataStreamAttributes: Record<string, unknown>;
  let integrationAttributes: Record<string, unknown>;

  const fieldsMetadataClient = {
    find: jest.fn().mockResolvedValue({ toPlain: () => ({}) }),
  } as unknown as IFieldsMetadataClient;

  const callUpdate = (
    changes: Array<{ name: string; type: 'long' | 'date' | 'keyword' | 'byte' }>
  ) =>
    service.updateDataStreamFieldTypes({
      integrationId: 'int_1',
      dataStreamId: 'ds_1',
      changes,
      version: 'WzEsMV0=',
      esClient: esClient as unknown as ElasticsearchClient,
      fieldsMetadataClient,
    });

  beforeEach(() => {
    service = new AutomaticImportService(
      loggerMock.create(),
      savedObjectsServiceMock.createSetupContract(),
      { registerTaskDefinitions: jest.fn() } as unknown as TaskManagerSetupContract,
      createCoreSetupMock() as unknown as CoreSetup<AutomaticImportPluginStartDependencies>,
      { reportEvent: jest.fn(), registerEventType: jest.fn() } as unknown as AnalyticsServiceSetup
    );

    dataStreamAttributes = {
      data_stream_id: 'ds_1',
      job_info: { status: 'completed' },
      metadata: {},
      field_type_overrides: [],
      result: {
        ingest_pipeline: {
          processors: [{ json: { field: 'message', target_field: 'parsed' } }],
        },
        field_mapping: [
          { name: 'port', type: 'keyword', is_ecs: false },
          { name: 'code', type: 'long', is_ecs: false },
          { name: 'when', type: 'keyword', is_ecs: false },
          { name: 'label', type: 'keyword', is_ecs: false },
          { name: '@timestamp', type: 'date', is_ecs: true },
        ],
        pipeline_docs: [],
      },
    };
    integrationAttributes = { integration_id: 'int_1', status: 'completed', metadata: {} };

    savedObjectService = {
      getDataStream: jest.fn().mockImplementation(async () => ({
        attributes: dataStreamAttributes,
        version: 'WzEsMV0=',
      })),
      getIntegration: jest.fn().mockImplementation(async () => integrationAttributes),
      getAllDataStreams: jest.fn().mockImplementation(async () => [dataStreamAttributes]),
      updateDataStreamSavedObjectAttributes: jest.fn().mockResolvedValue(undefined),
      updateIntegration: jest.fn().mockResolvedValue(undefined),
    };
    samplesIndexService = {
      getSamplesForDataStream: jest.fn().mockResolvedValue(['s1', 's2']),
    };
    esClient = { ingest: { simulate: jest.fn().mockImplementation(fakeSimulate) } };
    jest.mocked(validateFieldMappings).mockResolvedValue({ valid: true, errors: [] });

    const internals = service as unknown as {
      savedObjectService: unknown;
      samplesIndexService: unknown;
    };
    internals.savedObjectService = savedObjectService;
    internals.samplesIndexService = samplesIndexService;
  });

  it('rejects edits for data streams in the last approved package', async () => {
    integrationAttributes.metadata = { last_approved_data_stream_ids: ['ds_1'] };

    await expect(callUpdate([{ name: 'port', type: 'long' }])).rejects.toBeInstanceOf(
      FieldTypesLockedError
    );
    expect(esClient.ingest.simulate).not.toHaveBeenCalled();
  });

  it('derives legacy approval locks without writing during an integration read', async () => {
    integrationAttributes = {
      integration_id: 'int_1',
      created_by: 'user',
      status: 'approved',
      metadata: { title: 'Integration', description: 'Description' },
    };
    dataStreamAttributes = {
      ...dataStreamAttributes,
      title: 'Data stream',
      description: 'Description',
      input_types: [],
    };

    const result = await service.getIntegrationById('int_1');

    expect(result.lastApprovedDataStreamIds).toEqual(['ds_1']);
    expect(savedObjectService.updateIntegration).not.toHaveBeenCalled();
  });

  it('rejects edits for ECS and unknown fields', async () => {
    await expect(callUpdate([{ name: '@timestamp', type: 'keyword' }])).rejects.toBeInstanceOf(
      InvalidFieldTypeChangeError
    );
    await expect(callUpdate([{ name: 'missing', type: 'keyword' }])).rejects.toBeInstanceOf(
      InvalidFieldTypeChangeError
    );
  });

  it('does not block date types on unparsed values and simulates only once', async () => {
    const result = await callUpdate([{ name: 'when', type: 'date' }]);

    expect(result.status).toBe('saved');
    expect(esClient.ingest.simulate).toHaveBeenCalledTimes(1);
    expect(savedObjectService.updateDataStreamSavedObjectAttributes).toHaveBeenCalledTimes(1);
  });

  it('reports certain failures from the shared rules', async () => {
    const result = await callUpdate([{ name: 'code', type: 'byte' }]);

    expect(result).toEqual({
      status: 'failure',
      errors: [{ name: 'code', issue: 'out_of_range', failing_documents: 2, total_documents: 2 }],
    });
    expect(savedObjectService.updateDataStreamSavedObjectAttributes).not.toHaveBeenCalled();
  });

  it('saves the pipeline, docs, field mappings, and edits when every field passes', async () => {
    const result = await callUpdate([{ name: 'code', type: 'keyword' }]);

    expect(result.status).toBe('saved');
    const [[saved]] = savedObjectService.updateDataStreamSavedObjectAttributes.mock.calls;
    expect(saved.ingestPipeline.processors).toEqual([
      { json: { field: 'message', target_field: 'parsed' } },
    ]);
    expect(saved.pipelineDocs[0]).toEqual(expect.objectContaining({ code: 200 }));
    expect(saved.fieldMapping).toEqual(
      expect.arrayContaining([{ name: 'code', type: 'keyword', is_ecs: false }])
    );
    expect(saved.fieldTypeOverrides).toEqual([
      { name: 'code', type: 'keyword', original_type: 'long' },
    ]);
  });

  it('validates all samples but persists only 100 preview documents', async () => {
    const samples = Array.from({ length: 150 }, (_, index) => `sample-${index}`);
    samplesIndexService.getSamplesForDataStream.mockResolvedValue(samples);
    esClient.ingest.simulate.mockImplementation(({ docs }: { docs: Array<{ _source: Doc }> }) => ({
      docs: docs.map((_doc, index) => ({
        doc: { _source: { code: index, label: `value-${index}` } },
      })),
    }));

    await callUpdate([{ name: 'code', type: 'keyword' }]);

    expect(esClient.ingest.simulate.mock.calls[0][0].docs).toHaveLength(150);
    const [[saved]] = savedObjectService.updateDataStreamSavedObjectAttributes.mock.calls;
    expect(saved.pipelineDocs).toHaveLength(100);
  });

  it('rechecks the approval lock immediately before saving', async () => {
    jest.mocked(validateFieldMappings).mockImplementation(async () => {
      integrationAttributes.metadata = { last_approved_data_stream_ids: ['ds_1'] };
      return { valid: true, errors: [] };
    });

    await expect(callUpdate([{ name: 'code', type: 'keyword' }])).rejects.toBeInstanceOf(
      FieldTypesLockedError
    );
    expect(savedObjectService.updateDataStreamSavedObjectAttributes).not.toHaveBeenCalled();
  });

  it('removes the edit when a field goes back to its original type', async () => {
    dataStreamAttributes.field_type_overrides = [
      { name: 'code', type: 'keyword', original_type: 'long' },
    ];

    const result = await callUpdate([{ name: 'code', type: 'long' }]);

    expect(result.status).toBe('saved');
    const [[saved]] = savedObjectService.updateDataStreamSavedObjectAttributes.mock.calls;
    expect(saved.fieldTypeOverrides).toEqual([]);
    expect(saved.ingestPipeline.processors).toEqual([
      { json: { field: 'message', target_field: 'parsed' } },
    ]);
  });

  it('keeps stored edits when the pipeline JSON is saved', async () => {
    dataStreamAttributes.field_type_overrides = [
      { name: 'code', type: 'keyword', original_type: 'long' },
      { name: 'gone', type: 'long', original_type: 'keyword' },
    ];
    (dataStreamAttributes.result as Record<string, unknown>).field_mapping = [
      ...((dataStreamAttributes.result as { field_mapping: unknown[] }).field_mapping ?? []),
      { name: 'gone', type: 'keyword', is_ecs: false },
    ];

    await service.updateDataStreamPipeline({
      integrationId: 'int_1',
      dataStreamId: 'ds_1',
      ingestPipeline: { processors: [{ json: { field: 'message' } }] },
      version: 'WzEsMV0=',
      esClient: esClient as unknown as ElasticsearchClient,
      fieldsMetadataClient,
    });

    const [[saved]] = savedObjectService.updateDataStreamSavedObjectAttributes.mock.calls;
    expect(saved.fieldTypeOverrides).toEqual([
      { name: 'code', type: 'keyword', original_type: 'long' },
      { name: 'gone', type: 'long', original_type: 'keyword' },
    ]);
    expect(saved.ingestPipeline.processors).toEqual([{ json: { field: 'message' } }]);
    expect(saved.fieldMapping).toEqual(
      expect.arrayContaining([
        { name: 'code', type: 'keyword', is_ecs: false },
        { name: 'gone', type: 'long', is_ecs: false },
      ])
    );
  });

  it('rejects a pipeline save when a stored override has a certain failure', async () => {
    dataStreamAttributes.field_type_overrides = [
      { name: 'code', type: 'byte', original_type: 'long' },
    ];

    await expect(
      service.updateDataStreamPipeline({
        integrationId: 'int_1',
        dataStreamId: 'ds_1',
        ingestPipeline: { processors: [{ json: { field: 'message' } }] },
        version: 'WzEsMV0=',
        esClient: esClient as unknown as ElasticsearchClient,
        fieldsMetadataClient,
      })
    ).rejects.toBeInstanceOf(InvalidFieldTypeChangeError);
    expect(savedObjectService.updateDataStreamSavedObjectAttributes).not.toHaveBeenCalled();
  });

  it('rejects non-object pipelines and oversized processor arrays', async () => {
    const updatePipeline = (ingestPipeline: string) =>
      service.updateDataStreamPipeline({
        integrationId: 'int_1',
        dataStreamId: 'ds_1',
        ingestPipeline,
        version: 'WzEsMV0=',
        esClient: esClient as unknown as ElasticsearchClient,
        fieldsMetadataClient,
      });

    await expect(updatePipeline('null')).rejects.toThrow('expected a JSON object');
    await expect(
      updatePipeline(JSON.stringify({ processors: Array.from({ length: 10_001 }, () => ({})) }))
    ).rejects.toThrow('must contain at most 10000 entries');
  });

  it('blocks invalid generated mappings', async () => {
    jest.mocked(validateFieldMappings).mockResolvedValue({
      valid: false,
      errors: ['invalid mapping'],
    });

    await expect(callUpdate([{ name: 'code', type: 'keyword' }])).rejects.toThrow(
      'Invalid field mappings'
    );
    expect(savedObjectService.updateDataStreamSavedObjectAttributes).not.toHaveBeenCalled();
  });
});
