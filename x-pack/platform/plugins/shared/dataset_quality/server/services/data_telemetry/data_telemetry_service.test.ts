/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { FetchResult } from '@kbn/task-manager-plugin/server/task_store';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { createUsageCollectionSetupMock } from '@kbn/usage-collection-plugin/server/mocks';

import { DataTelemetryEvent, DataTelemetryObject } from './types';
import { MAX_STREAMS_TO_REPORT } from './constants';
import { DataTelemetryService } from './data_telemetry_service';

// Mock the constants module to speed up and simplify the tests
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  BREATHE_DELAY_SHORT: 10,
  BREATHE_DELAY_MEDIUM: 50,
  BREATHE_DELAY_LONG: 100,

  MAX_STREAMS_TO_REPORT: 50,

  LOGS_DATASET_INDEX_PATTERNS: [
    {
      pattern: 'test-pattern-*',
      patternName: 'test',
      shipper: 'custom',
    },
    {
      pattern: 'test-pattern-2-*',
      patternName: 'test-2',
      shipper: 'custom-2',
    },
  ],
}));

const TEST_TIMEOUT = 60 * 1000;
const SYNTH_DOCS = 6000000;

describe('DataTelemetryService', () => {
  let service: DataTelemetryService;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockUsageCollectionSetup: jest.Mocked<UsageCollectionSetup>;
  let mockTelemetryStart: jest.Mocked<TelemetryPluginStart>;
  let mockLogger: jest.Mocked<Logger>;
  let mockTaskManagerSetup: ReturnType<typeof taskManagerMock.createSetup>;
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let runTask: ReturnType<typeof setupMocks>['runTask'];

  let exampleEvent: Partial<DataTelemetryEvent>;
  let exampleTaskData: DataTelemetryObject;
  let exampleTaskFetchResult: FetchResult;

  describe('Task and Collector Setup', () => {
    beforeEach(async () => {
      const mocks = setupMocks();
      mockEsClient = mocks.mockEsClient;
      mockLogger = mocks.mockLogger;
      mockUsageCollectionSetup = mocks.mockUsageCollectionSetup;
      mockTelemetryStart = mocks.mockTelemetryStart;
      mockTaskManagerSetup = mocks.taskManagerSetup;
      mockTaskManagerStart = mocks.taskManagerStart;
      runTask = mocks.runTask;

      exampleEvent = {
        doc_count: 555,
      };
      exampleTaskData = { data: [exampleEvent as DataTelemetryEvent] };
      exampleTaskFetchResult = {
        docs: [{ state: { ran: true, data: [exampleEvent] } } as unknown as ConcreteTaskInstance],
        versionMap: new Map(),
      } as FetchResult;

      mockTaskManagerStart.fetch.mockResolvedValue(exampleTaskFetchResult);

      service = new DataTelemetryService(mockLogger);
      service.setup(mockTaskManagerSetup, mockUsageCollectionSetup);
      await service.start(
        mockTelemetryStart,
        {
          elasticsearch: { client: { asInternalUser: mockEsClient } },
        } as any,
        mockTaskManagerStart
      );
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.clearAllMocks();
    });

    it('should register usage collection', () => {
      expect(mockUsageCollectionSetup.makeUsageCollector).toHaveBeenCalledTimes(1);
      expect(mockUsageCollectionSetup.registerCollector).toHaveBeenCalledTimes(1);
    });

    it('should trigger task runner run method', async () => {
      jest.spyOn(service as any, 'shouldCollectTelemetry').mockResolvedValue(true);
      const collectTelemetryDataSpy = jest.spyOn(service as any, 'collectTelemetryData');

      await runTask();

      // Assert collectTelemetryData is called
      expect(collectTelemetryDataSpy).toHaveBeenCalledTimes(1);
    });

    it('isReady and fetch of usage collector reflect the correct state', async () => {
      await runTask();

      const collector = mockUsageCollectionSetup.makeUsageCollector.mock.results[0].value;
      expect(await collector.isReady()).toBe(true);
      expect(await collector.fetch()).toEqual(exampleTaskData);
    });

    it('isReady of usage collector should be false while the task is in progress', async () => {
      jest.spyOn(service as any, 'shouldCollectTelemetry').mockResolvedValue(true);
      const taskRunPromise = runTask();

      const collector = mockUsageCollectionSetup.makeUsageCollector.mock.results[0].value;
      expect(await collector.isReady()).toBe(false);

      await taskRunPromise;
    });

    it('isReady of usage collector should be false if collection is stopped', async () => {
      jest.spyOn(service as any, 'shouldCollectTelemetry').mockResolvedValue(true);
      service.stop();
      await runTask();

      const collector = mockUsageCollectionSetup.makeUsageCollector.mock.results[0].value;
      expect(await collector.isReady()).toBe(false);

      service.resume();
      expect(await collector.isReady()).toBe(true);
    });
  });

  describe('Docs Info', () => {
    beforeEach(async () => {
      const mocks = setupMocks();
      mockEsClient = mocks.mockEsClient;
      mockLogger = mocks.mockLogger;
      mockUsageCollectionSetup = mocks.mockUsageCollectionSetup;
      mockTelemetryStart = mocks.mockTelemetryStart;
      mockTaskManagerSetup = mocks.taskManagerSetup;
      mockTaskManagerStart = mocks.taskManagerStart;
      runTask = mocks.runTask;

      service = new DataTelemetryService(mockLogger);
      service.setup(mockTaskManagerSetup, mockUsageCollectionSetup);
      await service.start(
        mockTelemetryStart,
        {
          elasticsearch: { client: { asInternalUser: mockEsClient } },
        } as any,
        mockTaskManagerStart
      );

      jest.spyOn(service as any, 'shouldCollectTelemetry').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.clearAllMocks();
    });

    it(
      'should collect telemetry after startup and every interval',
      async () => {
        const collectTelemetryDataSpy = jest.spyOn(service as any, 'collectTelemetryData');

        await runTask();
        expect(collectTelemetryDataSpy).toHaveBeenCalledTimes(1);

        expect(mockEsClient.indices.getMapping).toHaveBeenCalledTimes(1);

        await runTask();
        expect(collectTelemetryDataSpy).toHaveBeenCalledTimes(2);

        expect(mockEsClient.indices.getMapping).toHaveBeenCalledTimes(2);
      },
      TEST_TIMEOUT
    );

    it(
      'should stop collection if telemetry is stopped',
      async () => {
        const collectTelemetryDataSpy = jest.spyOn(service as any, 'collectTelemetryData');

        await runTask();
        expect(collectTelemetryDataSpy).toHaveBeenCalledTimes(1);

        service.stop();

        const taskResult = await runTask();
        expect(taskResult?.state.data).toBeNull();
        expect(collectTelemetryDataSpy).toHaveBeenCalledTimes(1);
      },
      TEST_TIMEOUT
    );

    it(
      'should not collect data if telemetry is not opted in',
      async () => {
        jest.spyOn(service as any, 'shouldCollectTelemetry').mockResolvedValue(false);

        const collectTelemetryDataSpy = jest.spyOn(service as any, 'collectTelemetryData');

        await runTask();
        expect(collectTelemetryDataSpy).not.toHaveBeenCalled();

        const taskResult = await runTask();
        expect(taskResult?.state.data).toBeNull();
        expect(collectTelemetryDataSpy).not.toHaveBeenCalled();

        // Assert that logger.debug is called with appropriate message
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '[Logs Data Telemetry] Telemetry is not opted-in.'
        );
      },
      TEST_TIMEOUT
    );

    it(
      'should not collect if number of data streams exceed MAX_STREAMS_TO_REPORT',
      async () => {
        (mockEsClient.indices.getDataStream as unknown as jest.Mock).mockResolvedValue({
          data_streams: Array.from({ length: MAX_STREAMS_TO_REPORT + 1 }, (_, i) => ({
            name: `logs-postgresql.log-default-${i}`,
            indices: [
              {
                index_name: `.ds-logs-postgresql.log-default-${i}-000001`,
              },
            ],
            _meta: {
              managed: true,
              description: 'default logs template installed by x-pack',
            },
          })),
        });

        const taskResult = await runTask();
        expect(taskResult?.state.data).toBeNull();
        expect(mockEsClient.indices.getMapping).not.toHaveBeenCalled();
      },
      TEST_TIMEOUT
    );

    it(
      'creates telemetry events',
      async () => {
        jest.spyOn(service as any, 'shouldCollectTelemetry').mockResolvedValue(true);

        const taskResult = await runTask();
        expect(taskResult?.state.data).toBeTruthy();

        const expectedEvent1 = {
          doc_count: 4000 + 500 + 200,
          failure_store_doc_count: 300,
          index_count: 2 + 1 + 1,
          failure_store_index_count: 1,
          namespace_count: 1 + 1,
          size_in_bytes: 10089898 + 800000 + 500000,
          pattern_name: 'test',
          managed_by: ['fleet'],
          package_name: ['activemq'],
          beat: [],
        };
        const expectedEvent2 = {
          beat: [],
          doc_count: 1700,
          index_count: 3,
          namespace_count: 2,
          package_name: [],
          pattern_name: 'test-2',
          shipper: 'custom-2',
          size_in_bytes: 2300000,
        };

        expect(
          taskResult?.state.data as [Partial<DataTelemetryEvent>, Partial<DataTelemetryEvent>]
        ).toEqual([
          expect.objectContaining(expectedEvent1),
          expect.objectContaining(expectedEvent2),
        ]);
      },
      TEST_TIMEOUT
    );

    it(
      'should not include stats of excluded indices',
      async () => {
        jest.spyOn(service as any, 'shouldCollectTelemetry').mockResolvedValue(true);
        const taskResult = await runTask();

        const events = taskResult?.state.data as [
          Partial<DataTelemetryEvent>,
          Partial<DataTelemetryEvent>
        ];
        // doc_count should be less than SYNTH_DOCS for any event
        (events ?? []).forEach((event) => {
          expect(event.doc_count).toBeLessThan(SYNTH_DOCS);
        });
      },
      TEST_TIMEOUT
    );
  });

  describe('Fields Info and Structure Levels', () => {
    beforeEach(async () => {
      jest.mock('./constants', () => ({
        ...jest.requireActual('./constants'),
        LOGS_DATASET_INDEX_PATTERNS: [
          {
            pattern: 'test-pattern-*',
            patternName: 'test',
            shipper: 'custom',
          },
          {
            pattern: 'test-pattern-3-*',
            patternName: 'test-3',
            shipper: 'custom-3',
          },
        ],
      }));

      const mocks = setupMocks();
      mockEsClient = mocks.mockEsClient;
      mockLogger = mocks.mockLogger;
      mockUsageCollectionSetup = mocks.mockUsageCollectionSetup;
      mockTelemetryStart = mocks.mockTelemetryStart;
      mockTaskManagerSetup = mocks.taskManagerSetup;
      mockTaskManagerStart = mocks.taskManagerStart;
      runTask = mocks.runTask;

      service = new DataTelemetryService(mockLogger);
      service.setup(mockTaskManagerSetup, mockUsageCollectionSetup);
      await service.start(
        mockTelemetryStart,
        {
          elasticsearch: { client: { asInternalUser: mockEsClient } },
        } as any,
        mockTaskManagerStart
      );

      jest.spyOn(service as any, 'shouldCollectTelemetry').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.clearAllMocks();
    });

    it(
      'should correctly calculate total fields and count of resource fields',
      async () => {
        jest.spyOn(service as any, 'shouldCollectTelemetry').mockResolvedValue(true);

        const taskResult = await runTask();
        const firstEvent = (taskResult?.state.data as [Partial<DataTelemetryEvent>])?.[0];
        expect(firstEvent?.field_count).toBe(8);
        expect(firstEvent?.field_existence).toEqual({
          'container.id': 3000 + 500,
          'host.name': 3000 + 500,
          message: 3000,
          '@timestamp': 3000 + 500 + 200,
          'data_stream.dataset': 3000 + 500 + 200,
          'data_stream.namespace': 3000 + 500 + 200,
          'data_stream.type': 3000 + 500 + 200,
        });
      },
      TEST_TIMEOUT
    );

    it('should correctly calculate structure levels', async () => {
      jest.spyOn(service as any, 'shouldCollectTelemetry').mockResolvedValue(true);

      const taskResult = await runTask();
      const secondEvent = (
        taskResult?.state.data as [Partial<DataTelemetryEvent>, Partial<DataTelemetryEvent>]
      )?.[1];

      expect(secondEvent?.structure_level).toEqual({
        '1': 1000,
        '4': 500,
        '6': 200,
      });
    });
  });
});

function setupMocks() {
  const mockEsClient = {
    indices: {
      stats: jest.fn().mockImplementation(() => {
        const emptyAllStats: any = { _all: {} };

        // _all shouldn't be read hence overriding with empty here
        return Promise.resolve({
          ...emptyAllStats,
          indices: {
            ...emptyAllStats.indices,
            ...MOCK_POSTGRES_DEFAULT_STATS.indices,
            ...MOCK_POSTGRES_NON_DEFAULT_STATS.indices,
            ...MOCK_ACTIVE_MQ_DEFAULT_STATS.indices,
            ...MOCK_FLUENT_BIT_DEFAULT_STATS.indices,
            ...MOCK_SYNTH_DATA_STATS.indices,
          },
        });
      }),
      getDataStream: jest.fn().mockImplementation((params) => {
        if (params.name === 'test-pattern-2-*') {
          return Promise.resolve({
            data_streams: MOCK_FLUENT_BIT_DATA_STREAMS,
          });
        }

        return Promise.resolve({
          data_streams: [
            ...MOCK_POSTGRES_DATA_STREAMS,
            ...MOCK_SYNTH_DATA_STREAMS,
            ...MOCK_ACTIVE_MQ_FLEET_DATA_STREAMS,
          ],
        });
      }),
      get: jest.fn().mockResolvedValue(MOCK_INDICES),
      getMapping: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          ...MOCK_APACHE_GENERIC_INDEX_MAPPING,
          ...MOCK_POSTGRES_DEFAULT_MAPPINGS,
          ...MOCK_POSTGRES_NON_DEFAULT_MAPPINGS,
          ...MOCK_ACTIVE_MQ_DEFAULT_MAPPINGS,
          ...MOCK_FLUENT_BIT_DEFAULT_MAPPINGS,
        });
      }),
    },
    info: jest.fn().mockResolvedValue({}),
    transport: {
      request: jest.fn().mockImplementation((params) => {
        if (params.path?.includes('_stats') && params?.querystring?.failure_store === 'only') {
          return MOCK_ACTIVE_MQ_FAILURE_STATS;
        }

        return MOCK_ACTIVE_MQ_FAILURE_STATS;
      }),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;

  const mockLogger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  const mockUsageCollectionSetup = createUsageCollectionSetupMock();

  const mockTelemetryStart = {
    getIsOptedIn: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<TelemetryPluginStart>;

  const taskManagerSetup = taskManagerMock.createSetup();
  const taskManagerStart = taskManagerMock.createStart();

  const runTask = () => {
    const taskDefinitions = taskManagerSetup.registerTaskDefinitions.mock.calls[0][0];
    const taskType = Object.keys(taskDefinitions)[0];
    const taskRunner = taskDefinitions[taskType].createTaskRunner({ taskInstance: {} as any });

    return taskRunner.run();
  };

  return {
    mockEsClient,
    mockLogger,
    mockUsageCollectionSetup,
    mockTelemetryStart,
    taskManagerSetup,
    taskManagerStart,
    runTask,
  };
}

const MOCK_INDICES = {
  'apache-generic-index': {},
  '.ds-logs-postgresql.log-default-2024.07.31-000001': {},
  '.ds-logs-postgresql.log-default-2024.08.31-000002': {},
  '.ds-logs-synth.01-default-2024.07.31-000001': {},
  '.ds-logs-active-mq.fleet-2024.07.31-000001': {},
};

const MOCK_POSTGRES_DATA_STREAMS = [
  {
    name: 'logs-postgresql.log-default',
    indices: [
      {
        index_name: '.ds-logs-postgresql.log-default-2024.07.31-000001',
      },
      {
        index_name: '.ds-logs-postgresql.log-default-2024.08.31-000002',
      },
    ],
    _meta: {
      managed: true,
      description: 'default logs template installed by x-pack',
    },
  },
  {
    name: 'logs-postgresql.log-non-default',
    indices: [
      {
        index_name: '.ds-logs-postgresql.log-non-default-2024.07.31-000001',
      },
    ],
    _meta: {
      managed: true,
      description: 'default logs template installed by x-pack',
    },
  },
];
const MOCK_POSTGRES_DEFAULT_STATS = {
  _all: {
    ...getPrimaryDocsAndStoreSize(1000 + 3000, 1000000 + 9089898),
  },
  indices: {
    '.ds-logs-postgresql.log-default-2024.07.31-000001': getPrimaryDocsAndStoreSize(1000, 1000000),
    '.ds-logs-postgresql.log-default-2024.08.31-000002': getPrimaryDocsAndStoreSize(3000, 9089898),
  },
};

const MOCK_POSTGRES_NON_DEFAULT_STATS = {
  _all: {},
  indices: {
    '.ds-logs-postgresql.log-non-default-2024.07.31-000001': getPrimaryDocsAndStoreSize(
      500,
      800000
    ),
  },
};

const MOCK_POSTGRES_DEFAULT_MAPPINGS = {
  '.ds-logs-postgresql.log-default-2024.08.31-000002': {
    mappings: {
      properties: {
        ...getTimestampProp(),
        ...getContainerProp(),
        ...getDataStreamProps('postgresql.log', 'default', 'logs'),
        ...getHostProp(),
        ...getMessageProp(),
        custom_field_01: {
          type: 'float',
        },
      },
    },
  },
};

const MOCK_POSTGRES_NON_DEFAULT_MAPPINGS = {
  '.ds-logs-postgresql.log-non-default-2024.07.31-000001': {
    mappings: {
      properties: {
        ...getTimestampProp(),
        ...getContainerProp(),
        ...getDataStreamProps('postgresql.log', 'non-default', 'logs'),
        ...getHostProp(),
        custom_field_01: {
          type: 'float',
        },
      },
    },
  },
};

const MOCK_SYNTH_DATA_STREAMS = [
  {
    name: 'logs-synth.01-default',
    indices: [
      {
        index_name: '.ds-logs-synth.01-default-2024.07.31-000001',
      },
      {
        index_name: '.ds-logs-synth.01-default-2024.08.31-000002',
      },
    ],
    _meta: {
      managed: true,
      description: 'default logs template installed by x-pack',
    },
  },
];

// Docs from synth data shouldn't be counted in the telemetry events
const MOCK_SYNTH_DATA_STATS = {
  _all: {},
  indices: {
    '.ds-logs-synth.01-default-2024.07.31-000001': getPrimaryDocsAndStoreSize(
      SYNTH_DOCS,
      1000000000
    ),
  },
};

const MOCK_APACHE_GENERIC_INDEX_MAPPING = {
  'apache-generic-index': {
    mappings: {
      properties: {
        ...getTimestampProp(),
      },
    },
  },
};

const MOCK_ACTIVE_MQ_FLEET_DATA_STREAMS = [
  {
    name: 'logs-active-mq.fleet',
    indices: [
      {
        index_name: '.ds-logs-active-mq.fleet-2024.07.31-000001',
      },
    ],
    _meta: {
      package: {
        name: 'activemq',
      },
      managed_by: 'fleet',
      managed: true,
    },
  },
];

const MOCK_ACTIVE_MQ_DEFAULT_STATS = {
  _all: {},
  indices: {
    '.ds-logs-active-mq.fleet-2024.07.31-000001': getPrimaryDocsAndStoreSize(200, 500000),
  },
};

const MOCK_ACTIVE_MQ_FAILURE_STATS = {
  _all: {},
  indices: {
    '.fs-logs-active-mq.fleet-2024.07.31-000001': getPrimaryDocsAndStoreSize(300, 700000),
  },
};

const MOCK_ACTIVE_MQ_DEFAULT_MAPPINGS = {
  '.ds-logs-active-mq.fleet-2024.07.31-000001': {
    mappings: {
      properties: {
        ...getTimestampProp(),
        ...getDataStreamProps('active-mq.fleet', 'default', 'logs'),
      },
    },
  },
};

const MOCK_FLUENT_BIT_DATA_STREAMS = [
  {
    name: 'logs-fluent-bit.fleet',
    indices: [
      {
        index_name: '.ds-logs-fluent-bit.fleet-2024.07.31-000001',
      },
      {
        index_name: '.ds-logs-fluent-bit.fleet-2024.07.31-000002',
      },
      {
        index_name: '.ds-logs-fluent-bit.fleet-2024.07.31-000003',
      },
    ],
    _meta: {
      managed: true,
      description: 'default logs template installed by x-pack',
    },
  },
];

const MOCK_FLUENT_BIT_DEFAULT_MAPPINGS = {
  '.ds-logs-fluent-bit.fleet-2024.07.31-000001': {
    // Level 01
    mappings: {
      properties: {
        ...getTimestampProp(),
        ...getDataStreamProps('fluent-bit.fleet', 'default', 'logs'),
        ...getEcsVersionProp(),
      },
    },
  },
  '.ds-logs-fluent-bit.fleet-2024.07.31-000002': {
    // Level 04
    mappings: {
      properties: {
        ...getTimestampProp(),
        ...getHostProp(),
        ...getMessageProp(),
      },
    },
  },
  '.ds-logs-fluent-bit.fleet-2024.07.31-000003': {
    // Level 06
    mappings: {
      properties: {
        ...getTimestampProp(),
        ...getHostProp(),
        ...getMessageProp(),
        ...getEcsVersionProp(),
      },
    },
  },
};

const MOCK_FLUENT_BIT_DEFAULT_STATS = {
  _all: {},
  indices: {
    '.ds-logs-fluent-bit.fleet-2024.07.31-000001': getPrimaryDocsAndStoreSize(1000, 1000000),
    '.ds-logs-fluent-bit.fleet-2024.07.31-000002': getPrimaryDocsAndStoreSize(500, 800000),
    '.ds-logs-fluent-bit.fleet-2024.07.31-000003': getPrimaryDocsAndStoreSize(200, 500000),
  },
};

function getPrimaryDocsAndStoreSize(docs: number, storeSize: number) {
  return {
    primaries: {
      docs: {
        count: docs,
        deleted: 0,
        total_size_in_bytes: storeSize,
      },
      store: {
        size_in_bytes: storeSize,
      },
    },
  };
}

function getTimestampProp() {
  return {
    '@timestamp': {
      type: 'date',
      ignore_malformed: false,
    },
  };
}

function getDataStreamProps(dataset: string, namespace: string, type: string) {
  return {
    data_stream: {
      properties: {
        dataset: {
          type: 'constant_keyword',
          value: dataset,
        },
        namespace: {
          type: 'constant_keyword',
          value: namespace,
        },
        type: {
          type: 'constant_keyword',
          value: type,
        },
      },
    },
  };
}

function getContainerProp() {
  return {
    container: {
      properties: {
        id: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
      },
    },
  };
}

function getHostProp() {
  return {
    host: {
      properties: {
        name: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256,
            },
          },
        },
      },
    },
  };
}

function getEcsVersionProp() {
  return {
    ecs: {
      properties: {
        version: {
          type: 'keyword',
        },
      },
    },
  };
}

function getMessageProp() {
  return {
    message: {
      type: 'text',
    },
  };
}
