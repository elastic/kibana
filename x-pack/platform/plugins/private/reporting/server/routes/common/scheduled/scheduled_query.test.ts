/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AuditLogger,
  ElasticsearchClient,
  KibanaRequest,
  KibanaResponseFactory,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { createMockReportingCore } from '../../../test_helpers';
import {
  transformResponse,
  scheduledQueryFactory,
  CreatedAtSearchResponse,
  transformSingleResponse,
} from './scheduled_query';
import { ReportingCore } from '../../..';
import { ScheduledReportType } from '../../../types';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { omit } from 'lodash';

const fakeRawRequest = {
  headers: {
    authorization: `ApiKey skdjtq4u543yt3rhewrh`,
  },
  path: '/',
} as unknown as KibanaRequest;

const getMockResponseFactory = () =>
  ({
    ...httpServerMock.createResponseFactory(),
    forbidden: (obj: unknown) => obj,
    unauthorized: (obj: unknown) => obj,
    customError: (err: unknown) => err,
  } as unknown as KibanaResponseFactory);

const payload =
  '{"browserTimezone":"America/New_York","layout":{"dimensions":{"height":2220,"width":1364},"id":"preserve_layout"},"objectType":"dashboard","title":"[Logs] Web Traffic","version":"9.1.0","locatorParams":[{"id":"DASHBOARD_APP_LOCATOR","params":{"dashboardId":"edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b","preserveSavedFilters":true,"timeRange":{"from":"now-7d/d","to":"now"},"useHash":false,"viewMode":"view"}}],"isDeprecated":false}';
const jsonPayload = JSON.parse(payload);
const savedObjects: Array<SavedObject<ScheduledReportType>> = [
  {
    type: 'scheduled_report',
    id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
    namespaces: ['a-space'],
    attributes: {
      createdAt: '2025-05-06T21:10:17.137Z',
      createdBy: 'elastic',
      enabled: true,
      jobType: 'printable_pdf_v2',
      meta: {
        isDeprecated: false,
        layout: 'preserve_layout',
        objectType: 'dashboard',
      },
      migrationVersion: '9.1.0',
      title: '[Logs] Web Traffic',
      payload,
      schedule: {
        rrule: {
          freq: 3,
          interval: 3,
          byhour: [12],
          byminute: [0],
          tzid: 'UTC',
        },
      },
    },
    references: [],
    managed: false,
    updated_at: '2025-05-06T21:10:17.137Z',
    created_at: '2025-05-06T21:10:17.137Z',
    version: 'WzEsMV0=',
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.1.0',
  },
  {
    type: 'scheduled_report',
    id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
    namespaces: ['a-space'],
    attributes: {
      createdAt: '2025-05-06T21:12:06.584Z',
      createdBy: 'not-elastic',
      enabled: true,
      jobType: 'PNGV2',
      meta: {
        isDeprecated: false,
        layout: 'preserve_layout',
        objectType: 'dashboard',
      },
      migrationVersion: '9.1.0',
      notification: {
        email: {
          to: ['user@elastic.co'],
        },
      },
      title: 'Another cool dashboard',
      payload:
        '{"browserTimezone":"America/New_York","layout":{"dimensions":{"height":2220,"width":1364},"id":"preserve_layout"},"objectType":"dashboard","title":"[Logs] Web Traffic","version":"9.1.0","locatorParams":[{"id":"DASHBOARD_APP_LOCATOR","params":{"dashboardId":"edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b","preserveSavedFilters":true,"timeRange":{"from":"now-7d/d","to":"now"},"useHash":false,"viewMode":"view"}}],"isDeprecated":false}',
      schedule: {
        rrule: {
          freq: 1,
          interval: 3,
          tzid: 'UTC',
        },
      },
    },
    references: [],
    managed: false,
    updated_at: '2025-05-06T21:12:06.584Z',
    created_at: '2025-05-06T21:12:06.584Z',
    version: 'WzIsMV0=',
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.1.0',
  },
];
const soResponse: SavedObjectsFindResponse<ScheduledReportType> = {
  page: 1,
  per_page: 10,
  total: 2,
  saved_objects: savedObjects.map((so) => ({ ...so, score: 0 })),
};

const lastRunResponse: CreatedAtSearchResponse = {
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: { value: 2, relation: 'eq' },
    max_score: null,
    hits: [
      {
        _index: '.ds-.kibana-reporting-2025.05.06-000001',
        _id: '7c14d3e0-5d3f-4374-87f8-1758d2aaa10b',
        _score: null,
        _source: {
          created_at: '2025-05-06T21:12:07.198Z',
        },
        fields: {
          scheduled_report_id: ['2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        },
        sort: [1746565930198],
      },
      {
        _index: '.ds-.kibana-reporting-2025.05.06-000001',
        _id: '895f9620-cf3c-4e9e-9bf2-3750360ebd81',
        _score: null,
        _source: {
          created_at: '2025-05-06T12:00:00.500Z',
        },
        fields: {
          scheduled_report_id: ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca'],
        },
        sort: [1746565930198],
      },
    ],
  },
};

const mockLogger = loggingSystemMock.createLogger();

describe('scheduledQueryFactory', () => {
  let client: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let core: ReportingCore;
  let auditLogger: AuditLogger;
  let soClient: SavedObjectsClientContract;
  let taskManager: TaskManagerStartContract;
  let scheduledQuery: ReturnType<typeof scheduledQueryFactory>;
  let mockResponseFactory: ReturnType<typeof getMockResponseFactory>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const schema = createMockConfigSchema();
    core = await createMockReportingCore(schema);

    auditLogger = await core.getAuditLogger(fakeRawRequest);
    auditLogger.log = jest.fn();

    soClient = await core.getScopedSoClient(fakeRawRequest);
    soClient.find = jest.fn().mockImplementation(async () => {
      return soResponse;
    });
    soClient.bulkGet = jest.fn().mockImplementation(async () => ({ saved_objects: savedObjects }));
    soClient.bulkUpdate = jest.fn().mockImplementation(async () => ({
      saved_objects: savedObjects.map((so) => ({
        id: so.id,
        type: so.type,
        attributes: { enabled: false },
      })),
    }));
    client = (await core.getEsClient()).asInternalUser as typeof client;
    client.search.mockResponse(
      lastRunResponse as unknown as Awaited<ReturnType<ElasticsearchClient['search']>>
    );
    taskManager = await core.getTaskManager();
    taskManager.bulkDisable = jest.fn().mockImplementation(async () => ({
      tasks: savedObjects.map((so) => ({ id: so.id })),
      errors: [],
    }));
    scheduledQuery = scheduledQueryFactory(core);
    jest.spyOn(core, 'canManageReportingForSpace').mockResolvedValue(true);

    mockResponseFactory = getMockResponseFactory();
    (mockResponseFactory.ok as jest.Mock) = jest.fn((args: unknown) => args);
    (mockResponseFactory.forbidden as jest.Mock) = jest.fn((args: unknown) => args);
    (mockResponseFactory.badRequest as jest.Mock) = jest.fn((args: unknown) => args);
  });

  describe('list', () => {
    it('should pass parameters in the request body', async () => {
      const result = await scheduledQuery.list(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        { username: 'somebody' },
        1,
        10
      );

      expect(soClient.find).toHaveBeenCalledTimes(1);
      expect(soClient.find).toHaveBeenCalledWith({
        type: 'scheduled_report',
        page: 1,
        perPage: 10,
      });
      expect(client.search).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledWith({
        _source: ['created_at'],
        collapse: { field: 'scheduled_report_id' },
        index: '.reporting-*,.kibana-reporting*',
        query: {
          bool: {
            filter: [
              {
                terms: {
                  scheduled_report_id: [
                    'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
                    '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
                  ],
                },
              },
            ],
          },
        },
        size: 10,
        sort: [{ created_at: { order: 'desc' } }],
      });

      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'scheduled_report_list',
          category: ['database'],
          outcome: 'success',
          type: ['access'],
        },
        kibana: {
          saved_object: {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            type: 'scheduled_report',
            name: '[Logs] Web Traffic',
          },
        },
        message:
          'User has accessed scheduled report [id=aa8b6fb3-cf61-4903-bce3-eec9ddc823ca] [name=[Logs] Web Traffic]',
      });

      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'scheduled_report_list',
          category: ['database'],
          outcome: 'success',
          type: ['access'],
        },
        kibana: {
          saved_object: {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            type: 'scheduled_report',
            name: 'Another cool dashboard',
          },
        },
        message:
          'User has accessed scheduled report [id=2da1cb75-04c7-4202-a9f0-f8bcce63b0f4] [name=Another cool dashboard]',
      });

      expect(result).toEqual({
        page: 1,
        per_page: 10,
        total: 2,
        data: [
          {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            created_at: '2025-05-06T21:10:17.137Z',
            created_by: 'elastic',
            enabled: true,
            jobtype: 'printable_pdf_v2',
            last_run: '2025-05-06T12:00:00.500Z',
            next_run: expect.any(String),
            payload: jsonPayload,
            schedule: {
              rrule: {
                freq: 3,
                interval: 3,
                byhour: [12],
                byminute: [0],
                tzid: 'UTC',
              },
            },
            space_id: 'a-space',
            title: '[Logs] Web Traffic',
          },
          {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            created_at: '2025-05-06T21:12:06.584Z',
            created_by: 'not-elastic',
            enabled: true,
            jobtype: 'PNGV2',
            last_run: '2025-05-06T21:12:07.198Z',
            next_run: expect.any(String),
            notification: {
              email: {
                to: ['user@elastic.co'],
              },
            },
            payload: jsonPayload,
            space_id: 'a-space',
            title: 'Another cool dashboard',
            schedule: {
              rrule: {
                freq: 1,
                interval: 3,
                tzid: 'UTC',
              },
            },
          },
        ],
      });
    });

    it('should filter by username when user does not have manage reporting permissions', async () => {
      jest.spyOn(core, 'canManageReportingForSpace').mockResolvedValueOnce(false);
      await scheduledQuery.list(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        { username: 'somebody' },
        1,
        10
      );

      expect(soClient.find).toHaveBeenCalledTimes(1);
      expect(soClient.find).toHaveBeenCalledWith({
        type: 'scheduled_report',
        page: 1,
        perPage: 10,
        filter: 'scheduled_report.attributes.createdBy: "somebody"',
      });
      expect(client.search).toHaveBeenCalledTimes(1);
      expect(client.search).toHaveBeenCalledWith({
        _source: ['created_at'],
        collapse: { field: 'scheduled_report_id' },
        index: '.reporting-*,.kibana-reporting*',
        query: {
          bool: {
            filter: [
              {
                terms: {
                  scheduled_report_id: [
                    'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
                    '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
                  ],
                },
              },
            ],
          },
        },
        size: 10,
        sort: [{ created_at: { order: 'desc' } }],
      });
    });

    it('should return an empty array when there are no hits', async () => {
      soClient.find = jest.fn().mockImplementationOnce(async () => ({
        page: 1,
        per_page: 10,
        total: 0,
        saved_objects: [],
      }));
      const result = await scheduledQuery.list(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        { username: 'somebody' },
        1,
        10
      );
      expect(soClient.find).toHaveBeenCalledTimes(1);
      expect(soClient.find).toHaveBeenCalledWith({
        type: 'scheduled_report',
        page: 1,
        perPage: 10,
      });
      expect(client.search).not.toHaveBeenCalled();
      expect(result).toEqual({ page: 1, per_page: 10, total: 0, data: [] });
    });

    it('should reject if the soClient.find throws an error', async () => {
      soClient.find = jest.fn().mockImplementationOnce(async () => {
        throw new Error('Some error');
      });

      await expect(
        scheduledQuery.list(
          mockLogger,
          fakeRawRequest,
          mockResponseFactory,
          { username: 'somebody' },
          1,
          10
        )
      ).rejects.toMatchInlineSnapshot(`
        Object {
          "body": "Error listing scheduled reports: Some error",
          "statusCode": 500,
        }
      `);
    });

    it('should gracefully handle esClient.search errors', async () => {
      client.search.mockImplementationOnce(async () => {
        throw new Error('Some other error');
      });

      const result = await scheduledQuery.list(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        { username: 'somebody' },
        1,
        10
      );

      expect(result).toEqual({
        page: 1,
        per_page: 10,
        total: 2,
        data: [
          {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            created_at: '2025-05-06T21:10:17.137Z',
            created_by: 'elastic',
            enabled: true,
            jobtype: 'printable_pdf_v2',
            next_run: expect.any(String),
            payload: jsonPayload,
            schedule: {
              rrule: {
                freq: 3,
                interval: 3,
                byhour: [12],
                byminute: [0],
                tzid: 'UTC',
              },
            },
            space_id: 'a-space',
            title: '[Logs] Web Traffic',
          },
          {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            created_at: '2025-05-06T21:12:06.584Z',
            created_by: 'not-elastic',
            enabled: true,
            jobtype: 'PNGV2',
            next_run: expect.any(String),
            notification: {
              email: {
                to: ['user@elastic.co'],
              },
            },
            payload: jsonPayload,
            title: 'Another cool dashboard',
            schedule: {
              rrule: {
                freq: 1,
                interval: 3,
                tzid: 'UTC',
              },
            },
            space_id: 'a-space',
          },
        ],
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Error getting last run for scheduled reports: Some other error`
      );
    });
  });

  describe('bulkDisable', () => {
    it('should pass parameters in the request body', async () => {
      const result = await scheduledQuery.bulkDisable(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        { username: 'somebody' }
      );

      expect(soClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', type: 'scheduled_report' },
        { id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4', type: 'scheduled_report' },
      ]);
      expect(soClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(soClient.bulkUpdate).toHaveBeenCalledWith([
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          type: 'scheduled_report',
          attributes: { enabled: false },
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          type: 'scheduled_report',
          attributes: { enabled: false },
        },
      ]);
      expect(taskManager.bulkDisable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkDisable).toHaveBeenCalledWith([
        'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
        '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
      ]);

      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'scheduled_report_disable',
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          saved_object: {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            name: '[Logs] Web Traffic',
            type: 'scheduled_report',
          },
        },
        message:
          'User is disabling scheduled report [id=aa8b6fb3-cf61-4903-bce3-eec9ddc823ca] [name=[Logs] Web Traffic]',
      });

      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        event: {
          action: 'scheduled_report_disable',
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          saved_object: {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            name: 'Another cool dashboard',
            type: 'scheduled_report',
          },
        },
        message:
          'User is disabling scheduled report [id=2da1cb75-04c7-4202-a9f0-f8bcce63b0f4] [name=Another cool dashboard]',
      });

      expect(result).toEqual({
        scheduled_report_ids: [
          'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
        ],
        errors: [],
        total: 2,
      });
    });

    it('should not disable scheduled report when user does not have permissions', async () => {
      jest.spyOn(core, 'canManageReportingForSpace').mockResolvedValueOnce(false);
      soClient.bulkUpdate = jest.fn().mockImplementationOnce(async () => ({
        saved_objects: [
          {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            type: 'scheduled_report',
            attributes: { enabled: false },
          },
        ],
      }));
      taskManager.bulkDisable = jest.fn().mockImplementationOnce(async () => ({
        tasks: [{ id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca' }],
        errors: [],
      }));
      const result = await scheduledQuery.bulkDisable(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        { username: 'elastic' }
      );

      expect(soClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', type: 'scheduled_report' },
        { id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4', type: 'scheduled_report' },
      ]);
      expect(soClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(soClient.bulkUpdate).toHaveBeenCalledWith([
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          type: 'scheduled_report',
          attributes: { enabled: false },
        },
      ]);
      expect(taskManager.bulkDisable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkDisable).toHaveBeenCalledWith([
        'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
      ]);

      expect(result).toEqual({
        scheduled_report_ids: ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca'],
        errors: [
          {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            message: `Not found.`,
            status: 404,
          },
        ],
        total: 2,
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `User "elastic" attempted to disable scheduled report "2da1cb75-04c7-4202-a9f0-f8bcce63b0f4" created by "not-elastic" without sufficient privileges.`
      );

      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'scheduled_report_disable',
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          saved_object: {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            name: '[Logs] Web Traffic',
            type: 'scheduled_report',
          },
        },
        message:
          'User is disabling scheduled report [id=aa8b6fb3-cf61-4903-bce3-eec9ddc823ca] [name=[Logs] Web Traffic]',
      });
      expect(auditLogger.log).toHaveBeenNthCalledWith(2, {
        error: {
          code: 'Error',
          message: 'Not found.',
        },
        event: {
          action: 'scheduled_report_disable',
          category: ['database'],
          outcome: 'failure',
          type: ['change'],
        },
        kibana: {
          saved_object: {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            type: 'scheduled_report',
            name: 'Another cool dashboard',
          },
        },
        message:
          'Failed attempt to disable scheduled report [id=2da1cb75-04c7-4202-a9f0-f8bcce63b0f4] [name=Another cool dashboard]',
      });
    });

    it('should handle errors in bulk get', async () => {
      soClient.bulkGet = jest.fn().mockImplementationOnce(async () => ({
        saved_objects: [
          {
            id: savedObjects[0].id,
            type: savedObjects[0].type,
            error: {
              error: 'Not Found',
              message:
                'Saved object [scheduled-report/aa8b6fb3-cf61-4903-bce3-eec9ddc823ca] not found',
              statusCode: 404,
            },
          },
          savedObjects[1],
        ],
      }));
      soClient.bulkUpdate = jest.fn().mockImplementation(async () => ({
        saved_objects: [
          {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            type: 'scheduled_report',
            attributes: { enabled: false },
          },
        ],
      }));
      taskManager.bulkDisable = jest.fn().mockImplementation(async () => ({
        tasks: [{ id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4' }],
        errors: [],
      }));
      const result = await scheduledQuery.bulkDisable(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        { username: 'elastic' }
      );

      expect(soClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', type: 'scheduled_report' },
        { id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4', type: 'scheduled_report' },
      ]);
      expect(soClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(soClient.bulkUpdate).toHaveBeenCalledWith([
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          type: 'scheduled_report',
          attributes: { enabled: false },
        },
      ]);
      expect(taskManager.bulkDisable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkDisable).toHaveBeenCalledWith([
        '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
      ]);

      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'scheduled_report_disable',
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          saved_object: {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            name: 'Another cool dashboard',
            type: 'scheduled_report',
          },
        },
        message:
          'User is disabling scheduled report [id=2da1cb75-04c7-4202-a9f0-f8bcce63b0f4] [name=Another cool dashboard]',
      });

      expect(result).toEqual({
        scheduled_report_ids: ['2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        errors: [
          {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            message:
              'Saved object [scheduled-report/aa8b6fb3-cf61-4903-bce3-eec9ddc823ca] not found',
            status: 404,
          },
        ],
        total: 2,
      });
    });

    it('should short-circuit if no saved objects to update', async () => {
      soClient.bulkGet = jest.fn().mockImplementationOnce(async () => ({
        saved_objects: [
          {
            id: savedObjects[0].id,
            type: savedObjects[0].type,
            error: {
              error: 'Not found',
              message:
                'Saved object [scheduled-report/aa8b6fb3-cf61-4903-bce3-eec9ddc823ca] not found',
              statusCode: 404,
            },
          },
          {
            id: savedObjects[1].id,
            type: savedObjects[1].type,
            error: { error: 'Bad Request', message: 'Some unspecified error', statusCode: 404 },
          },
        ],
      }));
      const result = await scheduledQuery.bulkDisable(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        { username: 'elastic' }
      );

      expect(soClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', type: 'scheduled_report' },
        { id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4', type: 'scheduled_report' },
      ]);
      expect(soClient.bulkUpdate).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
      expect(taskManager.bulkDisable).not.toHaveBeenCalled();
      expect(result).toEqual({
        scheduled_report_ids: [],
        errors: [
          {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            message:
              'Saved object [scheduled-report/aa8b6fb3-cf61-4903-bce3-eec9ddc823ca] not found',
            status: 404,
          },
          {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            message: 'Some unspecified error',
            status: 404,
          },
        ],
        total: 2,
      });
    });

    it('should not update saved object if already disabled', async () => {
      soClient.bulkGet = jest.fn().mockImplementationOnce(async () => ({
        saved_objects: [
          {
            id: savedObjects[0].id,
            type: savedObjects[0].type,
            attributes: { ...savedObjects[0].attributes, enabled: false },
          },
          savedObjects[1],
        ],
      }));
      soClient.bulkUpdate = jest.fn().mockImplementation(async () => ({
        saved_objects: [
          {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            type: 'scheduled_report',
            attributes: { enabled: false },
          },
        ],
      }));
      const result = await scheduledQuery.bulkDisable(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        { username: 'somebody' }
      );

      expect(soClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', type: 'scheduled_report' },
        { id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4', type: 'scheduled_report' },
      ]);
      expect(soClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(soClient.bulkUpdate).toHaveBeenCalledWith([
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          type: 'scheduled_report',
          attributes: { enabled: false },
        },
      ]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Scheduled report aa8b6fb3-cf61-4903-bce3-eec9ddc823ca is already disabled`
      );
      expect(taskManager.bulkDisable).toHaveBeenCalledTimes(1);
      // TM still called with both in case the task was not disabled
      expect(taskManager.bulkDisable).toHaveBeenCalledWith([
        '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
        'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
      ]);

      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
        event: {
          action: 'scheduled_report_disable',
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          saved_object: {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            name: 'Another cool dashboard',
            type: 'scheduled_report',
          },
        },
        message:
          'User is disabling scheduled report [id=2da1cb75-04c7-4202-a9f0-f8bcce63b0f4] [name=Another cool dashboard]',
      });

      expect(result).toEqual({
        scheduled_report_ids: [
          'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
        ],
        errors: [],
        total: 2,
      });
    });

    it('should handle errors in bulk update', async () => {
      soClient.bulkUpdate = jest.fn().mockImplementation(async () => ({
        saved_objects: [
          {
            id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
            type: 'scheduled_report',
            attributes: { enabled: false },
          },
          {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            type: 'scheduled_report',
            error: { error: 'Conflict', message: 'Error updating saved object', statusCode: 409 },
          },
        ],
      }));
      taskManager.bulkDisable = jest.fn().mockImplementation(async () => ({
        tasks: [{ id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4' }],
        errors: [],
      }));
      const result = await scheduledQuery.bulkDisable(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        { username: 'elastic' }
      );

      expect(soClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', type: 'scheduled_report' },
        { id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4', type: 'scheduled_report' },
      ]);
      expect(soClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(soClient.bulkUpdate).toHaveBeenCalledWith([
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          type: 'scheduled_report',
          attributes: { enabled: false },
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          type: 'scheduled_report',
          attributes: { enabled: false },
        },
      ]);
      expect(taskManager.bulkDisable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkDisable).toHaveBeenCalledWith([
        '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
      ]);

      expect(auditLogger.log).toHaveBeenCalledTimes(3);
      expect(auditLogger.log).toHaveBeenNthCalledWith(3, {
        error: {
          code: 'Error',
          message: 'Error updating saved object',
        },
        event: {
          action: 'scheduled_report_disable',
          category: ['database'],
          outcome: 'failure',
          type: ['change'],
        },
        kibana: {
          saved_object: {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            type: 'scheduled_report',
          },
        },
        message:
          'Failed attempt to disable scheduled report [id=aa8b6fb3-cf61-4903-bce3-eec9ddc823ca]',
      });

      expect(result).toEqual({
        scheduled_report_ids: ['2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        errors: [
          {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            message: 'Error updating saved object',
            status: 409,
          },
        ],
        total: 2,
      });
    });

    it('should handle errors in bulk disable', async () => {
      taskManager.bulkDisable = jest.fn().mockImplementation(async () => ({
        tasks: [{ id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4' }],
        errors: [
          {
            type: 'task',
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            error: {
              statusCode: 400,
              error: 'Fail',
              message: 'Error disabling task',
            },
          },
        ],
      }));
      const result = await scheduledQuery.bulkDisable(
        mockLogger,
        fakeRawRequest,
        mockResponseFactory,
        ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        { username: 'elastic' }
      );

      expect(soClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', type: 'scheduled_report' },
        { id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4', type: 'scheduled_report' },
      ]);
      expect(soClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(soClient.bulkUpdate).toHaveBeenCalledWith([
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          type: 'scheduled_report',
          attributes: { enabled: false },
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          type: 'scheduled_report',
          attributes: { enabled: false },
        },
      ]);
      expect(taskManager.bulkDisable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkDisable).toHaveBeenCalledWith([
        'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
        '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
      ]);

      expect(result).toEqual({
        scheduled_report_ids: ['2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        errors: [
          {
            id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
            message:
              'Scheduled report disabled but task disabling failed due to: Error disabling task',
            status: 400,
          },
        ],
        total: 2,
      });
    });

    it('should reject if the soClient throws an error', async () => {
      soClient.bulkGet = jest.fn().mockImplementationOnce(async () => {
        throw new Error('Some error');
      });

      await expect(
        scheduledQuery.bulkDisable(
          mockLogger,
          fakeRawRequest,
          mockResponseFactory,
          ['aa8b6fb3-cf61-4903-bce3-eec9ddc823ca', '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
          { username: 'somebody' }
        )
      ).rejects.toMatchInlineSnapshot(`
        Object {
          "body": "Error disabling scheduled reports: Some error",
          "statusCode": 500,
        }
      `);
    });
  });
});

describe('transformResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should correctly transform the responses', () => {
    expect(transformResponse(mockLogger, soResponse, lastRunResponse)).toEqual({
      page: 1,
      per_page: 10,
      total: 2,
      data: [
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          created_at: '2025-05-06T21:10:17.137Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'printable_pdf_v2',
          last_run: '2025-05-06T12:00:00.500Z',
          next_run: expect.any(String),
          payload: jsonPayload,
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'not-elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: '2025-05-06T21:12:07.198Z',
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          payload: jsonPayload,
          title: 'Another cool dashboard',
          schedule: {
            rrule: {
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
        },
      ],
    });
  });

  it('should correctly transform the responses with rrule.dtstart field', () => {
    expect(
      transformResponse(
        mockLogger,
        {
          ...soResponse,
          saved_objects: savedObjects.map((so) => ({
            ...so,
            attributes: {
              ...so.attributes,
              schedule: {
                ...so.attributes.schedule,
                rrule: {
                  ...so.attributes.schedule.rrule,
                  dtstart: new Date().toISOString(),
                },
              },
            },
            score: 0,
          })),
        },
        lastRunResponse
      )
    ).toEqual({
      page: 1,
      per_page: 10,
      total: 2,
      data: [
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          created_at: '2025-05-06T21:10:17.137Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'printable_pdf_v2',
          last_run: '2025-05-06T12:00:00.500Z',
          next_run: expect.any(String),
          payload: jsonPayload,
          schedule: {
            rrule: {
              dtstart: expect.any(String),
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'not-elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: '2025-05-06T21:12:07.198Z',
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          payload: jsonPayload,
          title: 'Another cool dashboard',
          schedule: {
            rrule: {
              dtstart: expect.any(String),
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
        },
      ],
    });
  });

  it('should correctly transform a response with rrule.dtstart is in the future', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-05-06T21:10:17.137Z'));

    // current time is 2025-05-06T21:10:17.137Z which is a Tuesday
    // schedule is set to run every Friday at 17:00 UTC
    // start time is set to 2025-05-11T12:00:00.000Z (which is a Sunday)
    // next run should be the next Friday after 2025-05-11T12:00:00.000Z which is 2025-05-16T17:00:00.000Z
    // not the actual next friday which would be 2025-05-09T17:00:00.000Z
    const dtstart = '2025-05-11T12:00:00.000Z';
    expect(
      transformSingleResponse(mockLogger, {
        type: 'scheduled_report',
        id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
        namespaces: ['a-space'],
        attributes: {
          createdAt: '2025-05-06T21:10:17.137Z',
          createdBy: 'elastic',
          enabled: true,
          jobType: 'printable_pdf_v2',
          meta: {
            isDeprecated: false,
            layout: 'preserve_layout',
            objectType: 'dashboard',
          },
          migrationVersion: '9.1.0',
          title: '[Logs] Web Traffic',
          payload,
          schedule: {
            rrule: {
              dtstart,
              freq: 3,
              interval: 1,
              byhour: [17],
              byminute: [0],
              byweekday: ['FR'],
              tzid: 'UTC',
            },
          },
        },
        references: [],
        managed: false,
        updated_at: '2025-05-06T21:10:17.137Z',
        created_at: '2025-05-06T21:10:17.137Z',
        version: 'WzEsMV0=',
        coreMigrationVersion: '8.8.0',
        typeMigrationVersion: '10.1.0',
        score: 0,
      })
    ).toEqual({
      id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
      created_at: '2025-05-06T21:10:17.137Z',
      created_by: 'elastic',
      enabled: true,
      jobtype: 'printable_pdf_v2',
      next_run: '2025-05-16T17:00:00.000Z',
      payload: jsonPayload,
      schedule: {
        rrule: {
          dtstart,
          freq: 3,
          interval: 1,
          byhour: [17],
          byminute: [0],
          byweekday: ['FR'],
          tzid: 'UTC',
        },
      },
      space_id: 'a-space',
      title: '[Logs] Web Traffic',
    });

    jest.useRealTimers();
  });

  it('handles malformed payload', () => {
    const malformedSo = {
      ...savedObjects[0],
      attributes: {
        ...savedObjects[0].attributes,
        payload: 'not a valid JSON',
      },
      score: 0,
    };
    expect(
      transformResponse(
        mockLogger,
        {
          page: 1,
          per_page: 10,
          total: 1,
          saved_objects: [malformedSo],
        },
        lastRunResponse
      )
    ).toEqual({
      page: 1,
      per_page: 10,
      total: 1,
      data: [
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          created_at: '2025-05-06T21:10:17.137Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'printable_pdf_v2',
          last_run: '2025-05-06T12:00:00.500Z',
          next_run: expect.any(String),
          payload: undefined,
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
          title: '[Logs] Web Traffic',
        },
      ],
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      `Failed to parse payload for scheduled report aa8b6fb3-cf61-4903-bce3-eec9ddc823ca: Unexpected token 'o', \"not a valid JSON\" is not valid JSON`
    );
  });

  it('handles missing last run response', () => {
    const thisLastRunResponse: CreatedAtSearchResponse = {
      ...lastRunResponse,
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [lastRunResponse.hits.hits[0]],
      },
    };

    expect(transformResponse(mockLogger, soResponse, thisLastRunResponse)).toEqual({
      page: 1,
      per_page: 10,
      total: 2,
      data: [
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          created_at: '2025-05-06T21:10:17.137Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'printable_pdf_v2',
          last_run: undefined,
          next_run: expect.any(String),
          payload: jsonPayload,
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'not-elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: '2025-05-06T21:12:07.198Z',
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          payload: jsonPayload,
          title: 'Another cool dashboard',
          schedule: {
            rrule: {
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
        },
      ],
    });
  });

  it('handles malformed so with no namespace', () => {
    const malformedSo1 = { ...savedObjects[0], namespaces: [], score: 0 };
    const malformedSo2 = { ...omit(savedObjects[1], 'namespaces'), score: 0 };
    expect(
      transformResponse(
        mockLogger,
        {
          page: 1,
          per_page: 10,
          total: 2,
          saved_objects: [malformedSo1, malformedSo2],
        },
        lastRunResponse
      )
    ).toEqual({
      page: 1,
      per_page: 10,
      total: 2,
      data: [
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          created_at: '2025-05-06T21:10:17.137Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'printable_pdf_v2',
          last_run: '2025-05-06T12:00:00.500Z',
          next_run: expect.any(String),
          payload: jsonPayload,
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'default',
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'not-elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: '2025-05-06T21:12:07.198Z',
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          payload: jsonPayload,
          title: 'Another cool dashboard',
          schedule: {
            rrule: {
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
          space_id: 'default',
        },
      ],
    });
  });

  it('handles undefined last run response', () => {
    expect(transformResponse(mockLogger, soResponse)).toEqual({
      page: 1,
      per_page: 10,
      total: 2,
      data: [
        {
          id: 'aa8b6fb3-cf61-4903-bce3-eec9ddc823ca',
          created_at: '2025-05-06T21:10:17.137Z',
          created_by: 'elastic',
          enabled: true,
          jobtype: 'printable_pdf_v2',
          last_run: undefined,
          next_run: expect.any(String),
          payload: jsonPayload,
          schedule: {
            rrule: {
              freq: 3,
              interval: 3,
              byhour: [12],
              byminute: [0],
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
          title: '[Logs] Web Traffic',
        },
        {
          id: '2da1cb75-04c7-4202-a9f0-f8bcce63b0f4',
          created_at: '2025-05-06T21:12:06.584Z',
          created_by: 'not-elastic',
          enabled: true,
          jobtype: 'PNGV2',
          last_run: undefined,
          next_run: expect.any(String),
          notification: {
            email: {
              to: ['user@elastic.co'],
            },
          },
          payload: jsonPayload,
          title: 'Another cool dashboard',
          schedule: {
            rrule: {
              freq: 1,
              interval: 3,
              tzid: 'UTC',
            },
          },
          space_id: 'a-space',
        },
      ],
    });
  });
});
