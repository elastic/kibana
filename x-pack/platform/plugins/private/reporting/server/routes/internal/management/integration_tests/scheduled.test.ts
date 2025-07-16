/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { Readable } from 'stream';
import supertest from 'supertest';

jest.mock('../../../../lib/content_stream', () => ({
  getContentStream: jest.fn(),
}));

import { setupServer, SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import {
  ElasticsearchClientMock,
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { INTERNAL_ROUTES } from '@kbn/reporting-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { ExportType } from '@kbn/reporting-server';
import { ExportTypesRegistry } from '@kbn/reporting-server/export_types_registry';
import { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';

import { ReportingCore } from '../../../..';
import { ReportingInternalSetup, ReportingInternalStart } from '../../../../core';
import { ContentStream, getContentStream } from '../../../../lib';
import { reportingMock } from '../../../../mocks';
import {
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../../../test_helpers';
import { ReportingRequestHandlerContext, ScheduledReportType } from '../../../../types';
import { EventTracker } from '../../../../usage';
import { registerScheduledRoutesInternal } from '../scheduled';
import {
  KibanaRequest,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

const fakeRawRequest = {
  headers: {
    authorization: `ApiKey skdjtq4u543yt3rhewrh`,
  },
  path: '/',
} as unknown as KibanaRequest;

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
      createdBy: 'Tom Riddle',
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

const auditLogger = auditLoggerMock.create();

describe(`Reporting Schedule Management Routes: Internal`, () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let eventTracker: EventTracker;
  let usageCounter: IUsageCounter;
  let httpSetup: SetupServerReturn;
  let exportTypesRegistry: ExportTypesRegistry;
  let reportingCore: ReportingCore;
  let mockSetupDeps: ReportingInternalSetup;
  let mockStartDeps: ReportingInternalStart;
  let mockEsClient: ElasticsearchClientMock;
  let stream: jest.Mocked<ContentStream>;
  let soClient: SavedObjectsClientContract;
  let client: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let taskManager: TaskManagerStartContract;

  const mockLogger = loggingSystemMock.createLogger();
  const mockJobTypeUnencoded = 'unencodedJobType';
  const mockJobTypeBase64Encoded = 'base64EncodedJobType';

  const coreSetupMock = coreMock.createSetup();
  const mockConfigSchema = createMockConfigSchema();

  beforeEach(async () => {
    httpSetup = await setupServer(reportingSymbol);
    server = httpSetup.server;
    httpSetup.registerRouteHandlerContext<ReportingRequestHandlerContext, 'reporting'>(
      reportingSymbol,
      'reporting',
      () => reportingMock.createStart()
    );

    mockSetupDeps = createMockPluginSetup({
      security: {
        license: { isEnabled: () => true },
      },
      router: httpSetup.createRouter(''),
    });

    mockStartDeps = await createMockPluginStart(
      {
        licensing: {
          ...licensingMock.createStart(),
          license$: new BehaviorSubject({ isActive: true, isAvailable: true, type: 'gold' }),
        },
        securityService: {
          authc: {
            getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
          },
          audit: {
            asScoped: () => auditLogger,
          },
        },
      },
      mockConfigSchema
    );

    reportingCore = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);

    soClient = await reportingCore.getScopedSoClient(fakeRawRequest);
    soClient.find = jest.fn().mockImplementation(async () => {
      return soResponse;
    });

    soClient.bulkGet = jest
      .fn()
      .mockImplementation(async () => ({ saved_objects: [savedObjects[1]] }));
    soClient.bulkUpdate = jest.fn().mockImplementation(async () => ({
      saved_objects: [savedObjects[1]].map((so) => ({
        id: so.id,
        type: so.type,
        attributes: { enabled: false },
      })),
    }));

    taskManager = await reportingCore.getTaskManager();
    taskManager.bulkDisable = jest.fn().mockImplementation(async () => ({
      tasks: [savedObjects[1]].map((so) => ({ id: so.id })),
      errors: [],
    }));

    client = (await reportingCore.getEsClient()).asInternalUser as typeof client;
    client.search.mockResponse({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    });

    usageCounter = {
      domainId: 'abc123',
      incrementCounter: jest.fn(),
    };
    jest.spyOn(reportingCore, 'getUsageCounter').mockReturnValue(usageCounter);

    eventTracker = new EventTracker(coreSetupMock.analytics, 'jobId', 'exportTypeId', 'appId');
    jest.spyOn(reportingCore, 'getEventTracker').mockReturnValue(eventTracker);

    exportTypesRegistry = new ExportTypesRegistry();
    exportTypesRegistry.register({
      id: 'unencoded',
      jobType: mockJobTypeUnencoded,
      jobContentExtension: 'csv',
      validLicenses: ['basic', 'gold'],
    } as ExportType);
    exportTypesRegistry.register({
      id: 'base64Encoded',
      jobType: mockJobTypeBase64Encoded,
      jobContentEncoding: 'base64',
      jobContentExtension: 'pdf',
      validLicenses: ['basic', 'gold'],
    } as ExportType);
    reportingCore.getExportTypesRegistry = () => exportTypesRegistry;

    mockEsClient = (await reportingCore.getEsClient()).asInternalUser as typeof mockEsClient;
    stream = new Readable({
      read() {
        this.push('test');
        this.push(null);
      },
    }) as typeof stream;
    stream.end = jest.fn().mockImplementation((_name, _encoding, callback) => {
      callback();
    });

    (getContentStream as jest.MockedFunction<typeof getContentStream>).mockResolvedValue(stream);
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('list scheduled reports', () => {
    it('correct lists scheduled reports', async () => {
      registerScheduledRoutesInternal(reportingCore, mockLogger);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.SCHEDULED.LIST}`)
        .expect(200)
        .then(({ body }) =>
          expect(body).toEqual({
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
                created_by: 'Tom Riddle',
                enabled: true,
                jobtype: 'PNGV2',
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
          })
        );
    });

    it('fails on unauthenticated users', async () => {
      mockStartDeps = await createMockPluginStart(
        {
          licensing: {
            ...licensingMock.createStart(),
            license$: new BehaviorSubject({ isActive: true, isAvailable: true, type: 'gold' }),
          },
          securityService: {
            authc: { getCurrentUser: () => undefined },
            audit: {
              asScoped: () => auditLogger,
            },
          }, // security comes from core here
        },
        mockConfigSchema
      );
      reportingCore = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);
      registerScheduledRoutesInternal(reportingCore, mockLogger);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.SCHEDULED.LIST}`)
        .expect(401)
        .then(({ body }) =>
          expect(body.message).toMatchInlineSnapshot(`"Sorry, you aren't authenticated"`)
        );
    });

    it('fails on insufficient license', async () => {
      mockStartDeps = await createMockPluginStart(
        {
          licensing: {
            ...licensingMock.createStart(),
            license$: new BehaviorSubject({ isActive: true, isAvailable: true, type: 'basic' }),
          },
          securityService: {
            authc: {
              getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
            },
            audit: {
              asScoped: () => auditLogger,
            },
          },
        },
        mockConfigSchema
      );
      reportingCore = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);
      registerScheduledRoutesInternal(reportingCore, mockLogger);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.SCHEDULED.LIST}`)
        .expect(403)
        .then(({ body }) =>
          expect(body.message).toMatchInlineSnapshot(
            `"Your basic license does not support Scheduled reports. Please upgrade your license."`
          )
        );
    });
  });

  describe('disable scheduled reports', () => {
    it('correct disables scheduled reports', async () => {
      registerScheduledRoutesInternal(reportingCore, mockLogger);

      await server.start();
      await supertest(httpSetup.server.listener)
        .patch(`${INTERNAL_ROUTES.SCHEDULED.BULK_DISABLE}`)
        .send({
          ids: ['2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        })
        .expect(200)
        .then(({ body }) =>
          expect(body).toEqual({
            total: 1,
            scheduled_report_ids: ['2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
            errors: [],
          })
        );
    });

    it('fails on unauthenticated users', async () => {
      mockStartDeps = await createMockPluginStart(
        {
          licensing: {
            ...licensingMock.createStart(),
            license$: new BehaviorSubject({ isActive: true, isAvailable: true, type: 'gold' }),
          },
          securityService: {
            authc: { getCurrentUser: () => undefined },
            audit: {
              asScoped: () => auditLogger,
            },
          }, // security comes from core here
        },
        mockConfigSchema
      );
      reportingCore = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);
      registerScheduledRoutesInternal(reportingCore, mockLogger);

      await server.start();

      await supertest(httpSetup.server.listener)
        .patch(`${INTERNAL_ROUTES.SCHEDULED.BULK_DISABLE}`)
        .send({
          ids: ['2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        })
        .expect(401)
        .then(({ body }) =>
          expect(body.message).toMatchInlineSnapshot(`"Sorry, you aren't authenticated"`)
        );
    });

    it('fails on insufficient license', async () => {
      mockStartDeps = await createMockPluginStart(
        {
          licensing: {
            ...licensingMock.createStart(),
            license$: new BehaviorSubject({ isActive: true, isAvailable: true, type: 'basic' }),
          },
          securityService: {
            authc: {
              getCurrentUser: () => ({ id: '123', roles: ['superuser'], username: 'Tom Riddle' }),
            },
            audit: {
              asScoped: () => auditLogger,
            },
          },
        },
        mockConfigSchema
      );
      reportingCore = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);
      registerScheduledRoutesInternal(reportingCore, mockLogger);

      await server.start();

      await supertest(httpSetup.server.listener)
        .patch(`${INTERNAL_ROUTES.SCHEDULED.BULK_DISABLE}`)
        .send({
          ids: ['2da1cb75-04c7-4202-a9f0-f8bcce63b0f4'],
        })
        .expect(403)
        .then(({ body }) =>
          expect(body.message).toMatchInlineSnapshot(
            `"Your basic license does not support Scheduled reports. Please upgrade your license."`
          )
        );
    });
  });
});
