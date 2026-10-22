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
import type {
  AnalyticsServiceSetup,
  CoreSetup,
  ElasticsearchClient,
  KibanaRequest,
} from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import { AutomaticImportService } from './automatic_import_service';
import type { AutomaticImportPluginStartDependencies } from '../types';
import { InvalidFieldTypeChangeError } from '../errors';
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
type Processor = Record<string, Record<string, unknown>>;

const USER_PROCESSOR = { json: { field: 'message', target_field: 'parsed' } };
const VERSION = 'WzEsMV0=';

const generatedConvert = (field: string, type: string, extras: Record<string, unknown> = {}) => ({
  convert: {
    description: `Converts ${field} to match its ${
      type === 'string' ? 'keyword' : type
    } field type. Managed by Automatic Import.`,
    ...extras,
    tag: `automatic_import_field_type:${field}`,
    field,
    type,
    ignore_missing: true,
  },
});

/** Applies the convert processors the way Elasticsearch would, for top-level fields only. */
const runConvert = (source: Doc, config: Record<string, unknown>): string | undefined => {
  const field = String(config.field);
  const value = source[field];
  if (value === undefined || config.if === 'false') return undefined;
  const failure = `Processor 'convert' with tag '${config.tag}' in pipeline '_simulate_pipeline' failed with message 'unable to convert [${value}]'`;

  if (config.type === 'long' || config.type === 'integer') {
    if (!/^-?\d+$/.test(String(value))) return failure;
    source[field] = Number(value);
  } else if (config.type === 'double' || config.type === 'float') {
    if (Number.isNaN(Number(value))) return failure;
    source[field] = Number(value);
  } else if (config.type === 'string') {
    source[field] = String(value);
  }
  return undefined;
};

describe('AutomaticImportService data stream edits', () => {
  let service: AutomaticImportService;
  let savedObjectService: Record<string, jest.Mock>;
  let samplesIndexService: { getSamplesForDataStream: jest.Mock };
  let esClient: { ingest: { simulate: jest.Mock } };
  let dataStreamAttributes: Record<string, unknown>;
  let integrationAttributes: Record<string, unknown>;
  let parsedSamples: Doc[];

  const fieldsMetadataClient = {
    find: jest.fn().mockResolvedValue({ toPlain: () => ({}) }),
  } as unknown as IFieldsMetadataClient;

  /** Reports each processor until the first `fail` processor, like a verbose simulate. */
  const fakeVerboseResults = (processors: Processor[]) => {
    const failIndex = processors.findIndex((processor) => processor.fail);
    const ran = failIndex === -1 ? processors : processors.slice(0, failIndex + 1);
    return ran.map((processor) => {
      const [[processorType, config]] = Object.entries(processor);
      return processor.fail
        ? { processor_type: processorType, status: 'error', tag: config.tag, error: {} }
        : { processor_type: processorType, status: 'success', tag: config.tag };
    });
  };

  const fakeSimulate = ({
    pipeline,
    docs,
    verbose,
  }: {
    pipeline: { processors: Processor[] };
    docs: Array<{ _source: Doc }>;
    verbose?: boolean;
  }) => ({
    docs: docs.map((_doc, index) => {
      if (verbose) return { processor_results: fakeVerboseResults(pipeline.processors) };
      const source: Doc = { ...parsedSamples[index % parsedSamples.length] };
      for (const processor of pipeline.processors) {
        if (processor.fail) {
          return { error: { type: 'fail_processor_exception', reason: 'Failed on purpose' } };
        }
        const failure = processor.convert ? runConvert(source, processor.convert) : undefined;
        if (failure) {
          return { doc: { _source: { ...source, error: { message: [failure] } } } };
        }
      }
      return { doc: { _source: source } };
    }),
  });

  const applyEdits = ({
    processors = [USER_PROCESSOR],
    changes = [],
    dryRun = false,
    acknowledgeBreakingChanges = false,
    ingestPipeline,
  }: {
    processors?: Array<Record<string, unknown>>;
    changes?: Array<{ name: string; type: string }>;
    dryRun?: boolean;
    acknowledgeBreakingChanges?: boolean;
    ingestPipeline?: string;
  } = {}) =>
    service.applyDataStreamEdits({
      integrationId: 'int_1',
      dataStreamId: 'ds_1',
      ingestPipeline: ingestPipeline ?? { processors },
      changes,
      version: VERSION,
      dryRun,
      acknowledgeBreakingChanges,
      esClient: esClient as unknown as ElasticsearchClient,
      fieldsMetadataClient,
    });

  const getSaved = () => {
    const [[saved]] = savedObjectService.updateDataStreamSavedObjectAttributes.mock.calls;
    return saved;
  };

  beforeEach(() => {
    service = new AutomaticImportService(
      loggerMock.create(),
      savedObjectsServiceMock.createSetupContract(),
      { registerTaskDefinitions: jest.fn() } as unknown as TaskManagerSetupContract,
      createCoreSetupMock() as unknown as CoreSetup<AutomaticImportPluginStartDependencies>,
      { reportEvent: jest.fn(), registerEventType: jest.fn() } as unknown as AnalyticsServiceSetup
    );

    parsedSamples = [
      { port: '443', code: 200, when: '2024-01-01T00:00:00Z', label: 'a', bytes: '10' },
      { port: 'abc', code: 300, when: '2024-01-02', label: 'b', bytes: '20' },
    ];
    dataStreamAttributes = {
      data_stream_id: 'ds_1',
      job_info: { status: 'completed' },
      metadata: {},
      field_type_overrides: [],
      result: {
        ingest_pipeline: { processors: [USER_PROCESSOR] },
        field_mapping: [],
        pipeline_docs: [],
      },
    };
    integrationAttributes = { integration_id: 'int_1', status: 'completed', metadata: {} };

    savedObjectService = {
      getDataStream: jest.fn().mockImplementation(async () => ({
        attributes: dataStreamAttributes,
        version: VERSION,
      })),
      getIntegration: jest.fn().mockImplementation(async () => integrationAttributes),
      getAllDataStreams: jest.fn().mockImplementation(async () => [dataStreamAttributes]),
      updateDataStreamSavedObjectAttributes: jest.fn().mockResolvedValue(undefined),
      updateIntegration: jest.fn().mockResolvedValue(undefined),
      resetDataStreamForReanalysis: jest.fn().mockResolvedValue(undefined),
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

  describe('approved data streams', () => {
    const approve = (approvedFieldTypes?: Array<{ name: string; type: string }>) => {
      integrationAttributes.metadata = { last_approved_data_stream_ids: ['ds_1'] };
      if (approvedFieldTypes) dataStreamAttributes.approved_field_types = approvedFieldTypes;
    };

    it('reports whether the data stream is approved with its results', async () => {
      expect(await service.getDataStreamResults('int_1', 'ds_1')).toEqual(
        expect.objectContaining({ data_stream_approved: false, approved_field_types: [] })
      );

      approve([{ name: 'bytes', type: 'keyword' }]);

      expect(await service.getDataStreamResults('int_1', 'ds_1')).toEqual(
        expect.objectContaining({
          data_stream_approved: true,
          approved_field_types: [{ name: 'bytes', type: 'keyword' }],
        })
      );
    });

    it('rejects field type changes, including for fields added since approval', async () => {
      approve([{ name: 'code', type: 'long' }]);

      await expect(
        applyEdits({ changes: [{ name: 'bytes', type: 'long' }] })
      ).rejects.toBeInstanceOf(InvalidFieldTypeChangeError);
      expect(savedObjectService.updateDataStreamSavedObjectAttributes).not.toHaveBeenCalled();
    });

    it('accepts field type changes for data streams added since the last approval', async () => {
      integrationAttributes.metadata = { last_approved_data_stream_ids: ['ds_other'] };

      const result = await applyEdits({ changes: [{ name: 'bytes', type: 'long' }] });

      expect(result).toEqual(
        expect.objectContaining({ status: 'saved', data_stream_approved: false })
      );
      expect(getSaved().fieldTypeOverrides).toEqual([
        { name: 'bytes', type: 'long', original_type: 'keyword' },
      ]);
    });

    it('falls back to the current field types for data streams approved before they were stored', async () => {
      approve();
      (dataStreamAttributes.result as Doc).field_mapping = [
        { name: 'label', type: 'long', is_ecs: false },
      ];

      expect(await applyEdits()).toEqual({
        status: 'failure',
        field_errors: [
          {
            name: 'label',
            issue: 'not_numeric',
            failing_documents: 2,
            total_documents: 2,
            approved_type: 'long',
          },
        ],
      });
    });

    it('rejects deleting the generated processor of an approved field', async () => {
      approve([{ name: 'bytes', type: 'long' }]);
      dataStreamAttributes.field_type_overrides = [
        { name: 'bytes', type: 'long', original_type: 'keyword' },
      ];

      expect(await applyEdits({ processors: [USER_PROCESSOR] })).toEqual({
        status: 'failure',
        field_errors: [{ name: 'bytes', issue: 'approved_field_locked', approved_type: 'long' }],
      });
    });

    it('rejects hand-added generated processors, including for fields added since approval', async () => {
      approve([{ name: 'code', type: 'long' }]);

      expect(
        await applyEdits({
          processors: [
            USER_PROCESSOR,
            generatedConvert('bytes', 'long'),
            generatedConvert('code', 'string'),
          ],
        })
      ).toEqual({
        status: 'failure',
        field_errors: [{ name: 'bytes', issue: 'unsupported_generated_processor' }],
      });
      expect(
        await applyEdits({ processors: [USER_PROCESSOR, generatedConvert('code', 'string')] })
      ).toEqual({
        status: 'failure',
        field_errors: [{ name: 'code', issue: 'approved_field_locked', approved_type: 'long' }],
      });
    });

    it('keeps approved types when the pipeline infers a different type', async () => {
      approve([{ name: 'code', type: 'keyword' }]);

      const result = await applyEdits();

      expect(result.status).toBe('saved');
      expect(getSaved().fieldMapping).toEqual(
        expect.arrayContaining([{ name: 'code', type: 'keyword', is_ecs: false }])
      );
      expect(getSaved().ingestPipeline.processors).toEqual([USER_PROCESSOR]);
      expect(getSaved().fieldTypeOverrides).toEqual([]);
    });

    it('reports values that can no longer be stored as the approved type', async () => {
      approve([{ name: 'label', type: 'long' }]);

      expect(await applyEdits()).toEqual({
        status: 'failure',
        field_errors: [
          {
            name: 'label',
            issue: 'not_numeric',
            failing_documents: 2,
            total_documents: 2,
            approved_type: 'long',
          },
        ],
      });
    });

    it('reports approved fields that became objects', async () => {
      approve([{ name: 'label', type: 'keyword' }]);
      parsedSamples = parsedSamples.map((sample) => ({ ...sample, label: { text: 'a' } }));

      expect(await applyEdits()).toEqual({
        status: 'failure',
        field_errors: [{ name: 'label', issue: 'approved_field_locked', approved_type: 'keyword' }],
      });
    });

    it('saves pipeline edits and resets approval', async () => {
      integrationAttributes = {
        integration_id: 'int_1',
        status: 'approved',
        metadata: {
          title: 'Integration',
          version: '1.0.0',
          last_approved_data_stream_ids: ['ds_1'],
        },
      };
      dataStreamAttributes.approved_field_types = [{ name: 'code', type: 'long' }];
      const renamed = { rename: { field: 'label', target_field: 'name' } };

      const result = await applyEdits({ processors: [USER_PROCESSOR, renamed] });

      expect(result).toEqual(
        expect.objectContaining({
          status: 'saved',
          approved_field_types: [{ name: 'code', type: 'long' }],
          removed_approved_fields: [],
        })
      );
      expect(getSaved().ingestPipeline.processors).toEqual([USER_PROCESSOR, renamed]);
      expect(getSaved().approvedFieldTypes).toEqual([{ name: 'code', type: 'long' }]);
      expect(savedObjectService.updateIntegration).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
        '1.1.0'
      );
    });

    describe('when the pipeline stops producing approved fields', () => {
      beforeEach(() => {
        approve([
          { name: 'label', type: 'keyword' },
          { name: 'event.severity', type: 'long' },
          { name: 'code', type: 'long' },
        ]);
        (dataStreamAttributes.result as Doc).field_mapping = [
          { name: 'label', type: 'keyword', is_ecs: false },
          { name: 'event.severity', type: 'long', is_ecs: true },
          { name: 'code', type: 'long', is_ecs: false },
        ];
        parsedSamples = parsedSamples.map(({ label: _label, ...sample }) => sample);
      });

      it('lists the removed custom and ECS fields in the preview', async () => {
        expect(await applyEdits({ dryRun: true })).toEqual(
          expect.objectContaining({
            status: 'preview',
            removed_approved_fields: ['label', 'event.severity'],
          })
        );
      });

      it('fails a save that is not acknowledged and writes nothing', async () => {
        expect(await applyEdits()).toEqual({
          status: 'failure',
          field_errors: [],
          removed_approved_fields: ['label', 'event.severity'],
        });
        expect(savedObjectService.updateDataStreamSavedObjectAttributes).not.toHaveBeenCalled();
      });

      it('saves an acknowledged save and keeps the removed fields pinned', async () => {
        const result = await applyEdits({ acknowledgeBreakingChanges: true });

        expect(result).toEqual(
          expect.objectContaining({
            status: 'saved',
            removed_approved_fields: ['label', 'event.severity'],
          })
        );
        expect(getSaved().approvedFieldTypes).toEqual([
          { name: 'label', type: 'keyword' },
          { name: 'event.severity', type: 'long' },
          { name: 'code', type: 'long' },
        ]);
      });

      it('still rejects approved type changes when acknowledged', async () => {
        parsedSamples = parsedSamples.map((sample) => ({ ...sample, code: 'not a number' }));

        expect(await applyEdits({ acknowledgeBreakingChanges: true })).toEqual(
          expect.objectContaining({
            status: 'failure',
            field_errors: [expect.objectContaining({ name: 'code', approved_type: 'long' })],
          })
        );
      });

      it('warns once: fields already missing from the saved mapping are not listed again', async () => {
        (dataStreamAttributes.result as Doc).field_mapping = [
          { name: 'code', type: 'long', is_ecs: false },
        ];

        expect(await applyEdits()).toEqual(
          expect.objectContaining({ status: 'saved', removed_approved_fields: [] })
        );
      });
    });

    it('merges the current field types into the snapshot on approval', async () => {
      dataStreamAttributes.approved_field_types = [{ name: 'gone', type: 'long' }];
      (dataStreamAttributes.result as Doc).field_mapping = [
        { name: 'bytes', type: 'keyword', is_ecs: false },
        { name: '@timestamp', type: 'date', is_ecs: true },
        { name: 'parsed', type: 'group', is_ecs: false },
      ];
      savedObjectService.updateDataStreamApprovedFieldTypes = jest.fn();

      await service.approveIntegration({
        integrationId: 'int_1',
        authenticatedUser: { username: 'user' },
        version: '1.0.0',
        categories: [],
      } as unknown as Parameters<AutomaticImportService['approveIntegration']>[0]);

      expect(savedObjectService.updateDataStreamApprovedFieldTypes).toHaveBeenCalledWith(
        'ds_1',
        'int_1',
        [
          { name: 'gone', type: 'long' },
          { name: 'bytes', type: 'keyword' },
          { name: '@timestamp', type: 'date' },
        ]
      );
    });

    it('removes the data stream from the approved package when it is reanalyzed', async () => {
      integrationAttributes = {
        integration_id: 'int_1',
        status: 'approved',
        metadata: {
          title: 'Integration',
          version: '1.0.0',
          last_approved_data_stream_ids: ['ds_1', 'ds_2'],
        },
      };
      dataStreamAttributes = { ...dataStreamAttributes, title: 'Data stream' };
      (service as unknown as { taskManagerService: unknown }).taskManagerService = {
        removeDataStreamCreationTask: jest.fn().mockResolvedValue(undefined),
        scheduleDataStreamCreationTask: jest.fn().mockResolvedValue({ taskId: 'task_1' }),
      };

      await service.reanalyzeDataStream(
        { integrationId: 'int_1', dataStreamId: 'ds_1', connectorId: 'connector' },
        {} as KibanaRequest
      );

      expect(savedObjectService.updateIntegration).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          metadata: expect.objectContaining({ last_approved_data_stream_ids: ['ds_2'] }),
        }),
        '1.1.0'
      );
    });
  });

  describe('field type edits', () => {
    it('rejects edits for ECS fields', async () => {
      parsedSamples = parsedSamples.map((sample) => ({ ...sample, '@timestamp': '2024-01-01' }));
      (fieldsMetadataClient.find as jest.Mock).mockResolvedValueOnce({
        toPlain: () => ({ '@timestamp': { type: 'date' } }),
      });

      await expect(
        applyEdits({ changes: [{ name: '@timestamp', type: 'keyword' }] })
      ).rejects.toBeInstanceOf(InvalidFieldTypeChangeError);
    });

    it('reports changes for fields the pipeline no longer produces as dropped', async () => {
      const result = await applyEdits({ changes: [{ name: 'missing', type: 'long' }] });

      expect(result).toEqual(
        expect.objectContaining({ status: 'saved', dropped_field_types: ['missing'] })
      );
      expect(getSaved().fieldTypeOverrides).toEqual([]);
    });

    it('needs no processor or second simulate for date edits with parseable values', async () => {
      const result = await applyEdits({ changes: [{ name: 'when', type: 'date' }] });

      expect(result.status).toBe('saved');
      expect(esClient.ingest.simulate).toHaveBeenCalledTimes(1);
      expect(getSaved().ingestPipeline.processors).toEqual([USER_PROCESSOR]);
      expect(getSaved().fieldTypeOverrides).toEqual([
        { name: 'when', type: 'date', original_type: 'keyword' },
      ]);
    });

    it('reports certain failures from the shared rules', async () => {
      parsedSamples[1].when = 'March 5';

      expect(await applyEdits({ changes: [{ name: 'code', type: 'byte' }] })).toEqual({
        status: 'failure',
        field_errors: [
          { name: 'code', issue: 'out_of_range', failing_documents: 2, total_documents: 2 },
        ],
      });
      expect(await applyEdits({ changes: [{ name: 'when', type: 'date' }] })).toEqual({
        status: 'failure',
        field_errors: [
          { name: 'when', issue: 'not_date', failing_documents: 1, total_documents: 2 },
        ],
      });
      expect(savedObjectService.updateDataStreamSavedObjectAttributes).not.toHaveBeenCalled();
    });

    it('appends a convert processor and saves the converted docs, mappings, and edits', async () => {
      const result = await applyEdits({
        processors: [USER_PROCESSOR, generatedConvert('bytes', 'long')],
        changes: [{ name: 'bytes', type: 'long' }],
      });

      expect(result.status).toBe('saved');
      const saved = getSaved();
      expect(saved.ingestPipeline.processors).toEqual([
        USER_PROCESSOR,
        generatedConvert('bytes', 'long'),
      ]);
      expect(saved.pipelineDocs[0]).toEqual(expect.objectContaining({ bytes: 10 }));
      expect(saved.fieldMapping).toEqual(
        expect.arrayContaining([{ name: 'bytes', type: 'long', is_ecs: false }])
      );
      expect(saved.fieldTypeOverrides).toEqual([
        { name: 'bytes', type: 'long', original_type: 'keyword' },
      ]);
    });

    it('converts numbers to string for keyword edits', async () => {
      await applyEdits({ changes: [{ name: 'code', type: 'keyword' }] });

      const saved = getSaved();
      expect(saved.ingestPipeline.processors).toEqual([
        USER_PROCESSOR,
        generatedConvert('code', 'string'),
      ]);
      expect(saved.pipelineDocs[0]).toEqual(expect.objectContaining({ code: '200' }));
    });

    it('removes the edit and its processor when a field goes back to its original type', async () => {
      dataStreamAttributes.field_type_overrides = [
        { name: 'bytes', type: 'long', original_type: 'keyword' },
      ];

      await applyEdits({
        processors: [USER_PROCESSOR, generatedConvert('bytes', 'long')],
        changes: [{ name: 'bytes', type: 'keyword' }],
      });

      expect(getSaved().fieldTypeOverrides).toEqual([]);
      expect(getSaved().ingestPipeline.processors).toEqual([USER_PROCESSOR]);
    });

    it('drops stored edits for fields the pipeline no longer produces', async () => {
      dataStreamAttributes.field_type_overrides = [
        { name: 'gone', type: 'long', original_type: 'keyword' },
      ];

      const result = await applyEdits({
        processors: [USER_PROCESSOR, generatedConvert('gone', 'long')],
      });

      expect(result).toEqual(expect.objectContaining({ dropped_field_types: ['gone'] }));
      expect(getSaved().fieldTypeOverrides).toEqual([]);
      expect(getSaved().ingestPipeline.processors).toEqual([USER_PROCESSOR]);
    });

    it('validates all samples but persists only 100 preview documents', async () => {
      const samples = Array.from({ length: 150 }, (_, index) => `sample-${index}`);
      samplesIndexService.getSamplesForDataStream.mockResolvedValue(samples);

      await applyEdits({ changes: [{ name: 'code', type: 'keyword' }] });

      expect(esClient.ingest.simulate.mock.calls[0][0].docs).toHaveLength(150);
      expect(getSaved().pipelineDocs).toHaveLength(100);
    });
  });

  describe('pipeline edits', () => {
    beforeEach(() => {
      dataStreamAttributes.field_type_overrides = [
        { name: 'bytes', type: 'long', original_type: 'keyword' },
      ];
      (dataStreamAttributes.result as Doc).ingest_pipeline = {
        processors: [USER_PROCESSOR, generatedConvert('bytes', 'long')],
      };
    });

    it('keeps stored edits and generated processors when user processors change', async () => {
      const renamed = { rename: { field: 'label', target_field: 'name' } };

      await applyEdits({
        processors: [USER_PROCESSOR, renamed, generatedConvert('bytes', 'long')],
      });

      expect(getSaved().fieldTypeOverrides).toEqual([
        { name: 'bytes', type: 'long', original_type: 'keyword' },
      ]);
      expect(getSaved().ingestPipeline.processors).toEqual([
        USER_PROCESSOR,
        renamed,
        generatedConvert('bytes', 'long'),
      ]);
    });

    it('reverts the field type when its generated processor is deleted', async () => {
      await applyEdits({ processors: [USER_PROCESSOR] });

      expect(getSaved().fieldTypeOverrides).toEqual([]);
      expect(getSaved().ingestPipeline.processors).toEqual([USER_PROCESSOR]);
    });

    it('changes the field type when the generated convert type is edited', async () => {
      await applyEdits({ processors: [USER_PROCESSOR, generatedConvert('bytes', 'double')] });

      expect(getSaved().fieldTypeOverrides).toEqual([
        { name: 'bytes', type: 'double', original_type: 'keyword' },
      ]);
    });

    it('lets explicit changes win over a stale generated processor', async () => {
      await applyEdits({
        processors: [USER_PROCESSOR, generatedConvert('bytes', 'long')],
        changes: [{ name: 'bytes', type: 'double' }],
      });

      expect(getSaved().fieldTypeOverrides).toEqual([
        { name: 'bytes', type: 'double', original_type: 'keyword' },
      ]);
      expect(getSaved().ingestPipeline.processors).toEqual([
        USER_PROCESSOR,
        generatedConvert('bytes', 'double'),
      ]);
    });

    it('keeps user settings on generated processors and moves them to the end', async () => {
      const processor = generatedConvert('bytes', 'long', { if: 'ctx.bytes != null' });
      const renamed = { rename: { field: 'label', target_field: 'name' } };

      await applyEdits({ processors: [processor, USER_PROCESSOR, renamed] });

      expect(getSaved().ingestPipeline.processors).toEqual([USER_PROCESSOR, renamed, processor]);
    });

    it('rejects duplicate generated processors and unsupported convert types', async () => {
      expect(
        await applyEdits({
          processors: [
            USER_PROCESSOR,
            generatedConvert('bytes', 'long'),
            generatedConvert('bytes', 'long'),
          ],
        })
      ).toEqual({
        status: 'failure',
        field_errors: [{ name: 'bytes', issue: 'duplicate_generated_processor' }],
      });
      expect(
        await applyEdits({ processors: [USER_PROCESSOR, generatedConvert('bytes', 'auto')] })
      ).toEqual({
        status: 'failure',
        field_errors: [{ name: 'bytes', issue: 'invalid_convert_type' }],
      });
    });

    it('reports samples the generated convert fails on', async () => {
      parsedSamples[1].bytes = '1.5';

      expect(
        await applyEdits({ processors: [USER_PROCESSOR, generatedConvert('bytes', 'long')] })
      ).toEqual({
        status: 'failure',
        field_errors: [
          { name: 'bytes', issue: 'convert_failed', failing_documents: 1, total_documents: 2 },
        ],
      });
    });

    it('reports values a generated convert left unconverted', async () => {
      const processor = generatedConvert('bytes', 'long', { if: 'false' });

      expect(await applyEdits({ processors: [USER_PROCESSOR, processor] })).toEqual({
        status: 'failure',
        field_errors: [
          { name: 'bytes', issue: 'convert_unsupported', failing_documents: 2, total_documents: 2 },
        ],
      });
    });

    it('blocks edits that make more samples fail than the saved pipeline', async () => {
      const result = await applyEdits({
        processors: [
          USER_PROCESSOR,
          { fail: { message: 'nope', tag: 'fail_on_purpose' } },
          generatedConvert('bytes', 'long'),
        ],
      });

      expect(result).toEqual({
        status: 'failure',
        field_errors: [],
        pipeline_errors: {
          failed_samples: 2,
          baseline_failed_samples: 0,
          error_groups: [
            {
              error: 'Failed on purpose',
              count: 2,
              example_sample: 's1',
              processor_tag: 'fail_on_purpose',
            },
          ],
        },
      });
      expect(esClient.ingest.simulate).toHaveBeenCalledWith(
        expect.objectContaining({ verbose: true, docs: [{ _source: { message: 's1' } }] })
      );
      expect(savedObjectService.updateDataStreamSavedObjectAttributes).not.toHaveBeenCalled();
    });

    it('leaves out the processor tag when the failing processor has none', async () => {
      const result = await applyEdits({ processors: [USER_PROCESSOR, { fail: {} }] });

      expect(result).toEqual(
        expect.objectContaining({
          pipeline_errors: expect.objectContaining({
            error_groups: [{ error: 'Failed on purpose', count: 2, example_sample: 's1' }],
          }),
        })
      );
    });

    it('leaves out processor tags for very large pipelines', async () => {
      const filler = Array.from({ length: 500 }, (_unused, index) => ({
        set: { field: `filler_${index}`, value: 'x' },
      }));
      const result = await applyEdits({
        processors: [USER_PROCESSOR, ...filler, { fail: { tag: 'fail_on_purpose' } }],
      });

      expect(result).toEqual(
        expect.objectContaining({
          pipeline_errors: expect.objectContaining({
            error_groups: [{ error: 'Failed on purpose', count: 2, example_sample: 's1' }],
          }),
        })
      );
      expect(esClient.ingest.simulate).not.toHaveBeenCalledWith(
        expect.objectContaining({ verbose: true })
      );
    });

    it('reads a hand-added generated processor as a type change', async () => {
      await applyEdits({
        processors: [
          USER_PROCESSOR,
          generatedConvert('bytes', 'long'),
          generatedConvert('code', 'string'),
        ],
      });

      expect(getSaved().fieldTypeOverrides).toEqual([
        { name: 'bytes', type: 'long', original_type: 'keyword' },
        { name: 'code', type: 'keyword', original_type: 'long' },
      ]);
    });

    it('rejects a hand-added generated processor that has no effect', async () => {
      expect(
        await applyEdits({
          processors: [
            USER_PROCESSOR,
            generatedConvert('bytes', 'long'),
            generatedConvert('code', 'long'),
          ],
        })
      ).toEqual({
        status: 'failure',
        field_errors: [{ name: 'code', issue: 'unsupported_generated_processor' }],
      });
    });

    it('rejects non-object pipelines and oversized processor arrays', async () => {
      await expect(applyEdits({ ingestPipeline: 'null' })).rejects.toThrow(
        'expected a JSON object'
      );
      await expect(
        applyEdits({
          ingestPipeline: JSON.stringify({
            processors: Array.from({ length: 10_001 }, () => ({})),
          }),
        })
      ).rejects.toThrow('must contain at most 10000 entries');
    });
  });

  describe('dry run', () => {
    it('returns the rebuilt pipeline and preview without saving', async () => {
      const result = await applyEdits({ changes: [{ name: 'bytes', type: 'long' }], dryRun: true });

      expect(result).toEqual({
        status: 'preview',
        ingest_pipeline: { processors: [USER_PROCESSOR, generatedConvert('bytes', 'long')] },
        results: [expect.objectContaining({ bytes: 10 }), expect.objectContaining({ bytes: 20 })],
        field_mapping: expect.arrayContaining([{ name: 'bytes', type: 'long', is_ecs: false }]),
        field_type_overrides: [{ name: 'bytes', type: 'long', original_type: 'keyword' }],
        approved_field_types: [],
        data_stream_approved: false,
        dropped_field_types: [],
        removed_approved_fields: [],
        version: VERSION,
      });
      expect(savedObjectService.updateDataStreamSavedObjectAttributes).not.toHaveBeenCalled();
      expect(savedObjectService.updateIntegration).not.toHaveBeenCalled();
    });
  });

  it('blocks invalid generated mappings', async () => {
    jest.mocked(validateFieldMappings).mockResolvedValue({
      valid: false,
      errors: ['invalid mapping'],
    });

    await expect(applyEdits({ changes: [{ name: 'code', type: 'keyword' }] })).rejects.toThrow(
      'Invalid field mappings'
    );
    expect(savedObjectService.updateDataStreamSavedObjectAttributes).not.toHaveBeenCalled();
  });
});
