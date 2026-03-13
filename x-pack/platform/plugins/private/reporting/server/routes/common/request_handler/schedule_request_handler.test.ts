/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('uuid', () => ({ v4: () => 'mock-report-id' }));

import rison from '@kbn/rison';

import type {
  AuditLogger,
  FakeRawRequest,
  KibanaRequest,
  KibanaResponseFactory,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { JobParamsPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import type { ReportingCore } from '../../..';
import {
  createMockPluginSetup,
  createMockPluginStart,
  createMockReportingCore,
} from '../../../test_helpers';
import type { ReportingRequestHandlerContext, ReportingSetup, ReportingUser } from '../../../types';
import { ScheduleRequestHandler } from './schedule_request_handler';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { BehaviorSubject } from 'rxjs';

const getMockContext = () =>
  ({
    core: coreMock.createRequestHandlerContext(),
  } as unknown as ReportingRequestHandlerContext);

const getMockRequest = () =>
  ({
    url: { port: '5601', search: '', pathname: '/foo' },
    route: { path: '/foo', options: {} },
  } as KibanaRequest<unknown, unknown, unknown>);

const getMockResponseFactory = () =>
  ({
    ...httpServerMock.createResponseFactory(),
    forbidden: (obj: unknown) => obj,
    unauthorized: (obj: unknown) => obj,
    customError: (err: unknown) => err,
  } as unknown as KibanaResponseFactory);

const mockLogger = loggingSystemMock.createLogger();
const mockJobParams: JobParamsPDFV2 = {
  browserTimezone: 'UTC',
  objectType: 'cool_object_type',
  title: 'cool_title',
  version: 'unknown',
  layout: { id: 'preserve_layout' },
  locatorParams: [],
};

const fakeRawRequest: FakeRawRequest = {
  headers: {
    authorization: `ApiKey skdjtq4u543yt3rhewrh`,
  },
  path: '/',
};

describe('Handle request to schedule', () => {
  let reportingCore: ReportingCore;
  let mockContext: ReturnType<typeof getMockContext>;
  let mockRequest: ReturnType<typeof getMockRequest>;
  let mockResponseFactory: ReturnType<typeof getMockResponseFactory>;
  let requestHandler: ScheduleRequestHandler;
  let soClient: SavedObjectsClientContract;
  let auditLogger: AuditLogger;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mockConfig = createMockConfigSchema({});
    reportingCore = await createMockReportingCore(
      mockConfig,
      createMockPluginSetup({}),
      await createMockPluginStart(
        {
          licensing: {
            ...licensingMock.createStart(),
            license$: new BehaviorSubject({
              isAvailable: true,
              isActive: true,
              type: 'platinum',
              getFeature: () => true,
            }),
          },
        },
        mockConfig
      )
    );

    mockRequest = getMockRequest();

    mockResponseFactory = getMockResponseFactory();
    (mockResponseFactory.ok as jest.Mock) = jest.fn((args: unknown) => args);
    (mockResponseFactory.forbidden as jest.Mock) = jest.fn((args: unknown) => args);
    (mockResponseFactory.badRequest as jest.Mock) = jest.fn((args: unknown) => args);

    mockContext = getMockContext();
    mockContext.reporting = Promise.resolve({} as ReportingSetup);

    auditLogger = await reportingCore.getAuditLogger(fakeRawRequest as unknown as KibanaRequest);
    auditLogger.log = jest.fn();
    soClient = await reportingCore.getScopedSoClient(fakeRawRequest as unknown as KibanaRequest);
    soClient.create = jest.fn().mockImplementation(async (_, opts) => {
      return {
        id: 'foo',
        attributes: opts,
        type: 'scheduled-report',
      };
    });

    jest.spyOn(reportingCore, 'scheduleRecurringTask').mockResolvedValue({
      id: 'task-id',
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(),
      state: {},
      ownerId: 'reporting',
      taskType: 'reporting:printable_pdf_v2',
      params: {},
    });

    jest.spyOn(reportingCore, 'getHealthInfo').mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
      areNotificationsEnabled: true,
    });

    requestHandler = new ScheduleRequestHandler({
      reporting: reportingCore,
      user: { username: 'testymcgee' } as ReportingUser,
      context: mockContext,
      path: '/api/reporting/test/generate/pdf',
      // @ts-ignore
      req: mockRequest,
      res: mockResponseFactory,
      logger: mockLogger,
    });
  });

  describe('enqueueJob', () => {
    test('creates a scheduled_report saved object and schedules task', async () => {
      const report = await requestHandler.enqueueJob({
        exportTypeId: 'printablePdfV2',
        jobParams: mockJobParams,
        schedule: { rrule: { freq: 1, interval: 2, tzid: 'UTC' } },
      });

      const { id, created_at, payload, ...snapObj } = report;
      expect(snapObj).toMatchInlineSnapshot(`
        Object {
          "created_by": "testymcgee",
          "jobtype": "printable_pdf_v2",
          "meta": Object {
            "isDeprecated": false,
            "layout": "preserve_layout",
            "objectType": "cool_object_type",
          },
          "migration_version": "unknown",
          "notification": undefined,
          "schedule": Object {
            "rrule": Object {
              "freq": 1,
              "interval": 2,
              "tzid": "UTC",
            },
          },
        }
      `);
      expect(payload).toMatchInlineSnapshot(`
        Object {
          "browserTimezone": "UTC",
          "isDeprecated": false,
          "layout": Object {
            "id": "preserve_layout",
          },
          "locatorParams": Array [],
          "objectType": "cool_object_type",
          "title": "cool_title",
          "version": "unknown",
        }
      `);

      expect(auditLogger.log).toHaveBeenCalledWith({
        event: {
          action: 'scheduled_report_schedule',
          category: ['database'],
          outcome: 'unknown',
          type: ['creation'],
        },
        kibana: {
          saved_object: { id: 'mock-report-id', name: 'cool_title', type: 'scheduled_report' },
        },
        message: 'User is creating scheduled report [id=mock-report-id] [name=cool_title]',
      });

      expect(soClient.create).toHaveBeenCalledWith(
        'scheduled_report',
        {
          jobType: 'printable_pdf_v2',
          createdAt: expect.any(String),
          createdBy: 'testymcgee',
          title: 'cool_title',
          enabled: true,
          payload: JSON.stringify(payload),
          schedule: {
            rrule: {
              freq: 1,
              interval: 2,
              tzid: 'UTC',
            },
          },
          migrationVersion: 'unknown',
          meta: {
            objectType: 'cool_object_type',
            layout: 'preserve_layout',
            isDeprecated: false,
          },
        },
        { id: 'mock-report-id' }
      );

      expect(reportingCore.scheduleRecurringTask).toHaveBeenCalledWith(mockRequest, {
        id: 'foo',
        jobtype: 'printable_pdf_v2',
        schedule: { rrule: { freq: 1, interval: 2, tzid: 'UTC' } },
      });
    });

    test('creates a scheduled_report saved object with notification', async () => {
      const report = await requestHandler.enqueueJob({
        exportTypeId: 'printablePdfV2',
        jobParams: mockJobParams,
        schedule: { rrule: { freq: 1, interval: 2, tzid: 'UTC' } },
        notification: { email: { to: ['a@b.com'] } },
      });

      const { id, created_at, payload, ...snapObj } = report;
      expect(snapObj).toMatchInlineSnapshot(`
        Object {
          "created_by": "testymcgee",
          "jobtype": "printable_pdf_v2",
          "meta": Object {
            "isDeprecated": false,
            "layout": "preserve_layout",
            "objectType": "cool_object_type",
          },
          "migration_version": "unknown",
          "notification": Object {
            "email": Object {
              "to": Array [
                "a@b.com",
              ],
            },
          },
          "schedule": Object {
            "rrule": Object {
              "freq": 1,
              "interval": 2,
              "tzid": "UTC",
            },
          },
        }
      `);
      expect(payload).toMatchInlineSnapshot(`
        Object {
          "browserTimezone": "UTC",
          "isDeprecated": false,
          "layout": Object {
            "id": "preserve_layout",
          },
          "locatorParams": Array [],
          "objectType": "cool_object_type",
          "title": "cool_title",
          "version": "unknown",
        }
      `);

      expect(auditLogger.log).toHaveBeenCalledWith({
        event: {
          action: 'scheduled_report_schedule',
          category: ['database'],
          outcome: 'unknown',
          type: ['creation'],
        },
        kibana: {
          saved_object: { id: 'mock-report-id', name: 'cool_title', type: 'scheduled_report' },
        },
        message: 'User is creating scheduled report [id=mock-report-id] [name=cool_title]',
      });

      expect(soClient.create).toHaveBeenCalledWith(
        'scheduled_report',
        {
          jobType: 'printable_pdf_v2',
          createdAt: expect.any(String),
          createdBy: 'testymcgee',
          title: 'cool_title',
          enabled: true,
          payload: JSON.stringify(payload),
          schedule: {
            rrule: {
              freq: 1,
              interval: 2,
              tzid: 'UTC',
            },
          },
          migrationVersion: 'unknown',
          meta: {
            objectType: 'cool_object_type',
            layout: 'preserve_layout',
            isDeprecated: false,
          },
          notification: { email: { to: ['a@b.com'] } },
        },
        { id: 'mock-report-id' }
      );
    });

    test('creates a scheduled_report saved object and rrule dtstart', async () => {
      const report = await requestHandler.enqueueJob({
        exportTypeId: 'printablePdfV2',
        jobParams: mockJobParams,
        schedule: {
          rrule: { dtstart: '2025-06-23T14:17:19.765Z', freq: 1, interval: 2, tzid: 'UTC' },
        },
      });

      const { id, created_at, payload, ...snapObj } = report;
      expect(snapObj).toMatchInlineSnapshot(`
        Object {
          "created_by": "testymcgee",
          "jobtype": "printable_pdf_v2",
          "meta": Object {
            "isDeprecated": false,
            "layout": "preserve_layout",
            "objectType": "cool_object_type",
          },
          "migration_version": "unknown",
          "notification": undefined,
          "schedule": Object {
            "rrule": Object {
              "dtstart": "2025-06-23T14:17:19.765Z",
              "freq": 1,
              "interval": 2,
              "tzid": "UTC",
            },
          },
        }
      `);
      expect(payload).toMatchInlineSnapshot(`
        Object {
          "browserTimezone": "UTC",
          "isDeprecated": false,
          "layout": Object {
            "id": "preserve_layout",
          },
          "locatorParams": Array [],
          "objectType": "cool_object_type",
          "title": "cool_title",
          "version": "unknown",
        }
      `);

      expect(auditLogger.log).toHaveBeenCalledWith({
        event: {
          action: 'scheduled_report_schedule',
          category: ['database'],
          outcome: 'unknown',
          type: ['creation'],
        },
        kibana: {
          saved_object: { id: 'mock-report-id', name: 'cool_title', type: 'scheduled_report' },
        },
        message: 'User is creating scheduled report [id=mock-report-id] [name=cool_title]',
      });

      expect(soClient.create).toHaveBeenCalledWith(
        'scheduled_report',
        {
          jobType: 'printable_pdf_v2',
          createdAt: expect.any(String),
          createdBy: 'testymcgee',
          title: 'cool_title',
          enabled: true,
          payload: JSON.stringify(payload),
          schedule: {
            rrule: {
              dtstart: '2025-06-23T14:17:19.765Z',
              freq: 1,
              interval: 2,
              tzid: 'UTC',
            },
          },
          migrationVersion: 'unknown',
          meta: {
            objectType: 'cool_object_type',
            layout: 'preserve_layout',
            isDeprecated: false,
          },
        },
        { id: 'mock-report-id' }
      );

      expect(reportingCore.scheduleRecurringTask).toHaveBeenCalledWith(mockRequest, {
        id: 'foo',
        jobtype: 'printable_pdf_v2',
        schedule: {
          rrule: { dtstart: '2025-06-23T14:17:19.765Z', freq: 1, interval: 2, tzid: 'UTC' },
        },
      });
    });

    test('throws errors from so client create', async () => {
      soClient.create = jest.fn().mockImplementationOnce(async () => {
        throw new Error('SO create error');
      });

      await expect(
        requestHandler.enqueueJob({
          exportTypeId: 'printablePdfV2',
          jobParams: mockJobParams,
          schedule: { rrule: { freq: 1, interval: 2, tzid: 'UTC' } },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"SO create error"`);
    });
  });

  describe('getJobParams', () => {
    test('parse jobParams from body', () => {
      // @ts-ignore body is a read-only property
      mockRequest.body = { jobParams: rison.encode(mockJobParams) };
      expect(requestHandler.getJobParams()).toEqual(mockJobParams);
    });

    test('handles missing job params', () => {
      let error: { statusCode: number; body: string } | undefined;
      try {
        requestHandler.getJobParams();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
    });

    test('handles null job params', () => {
      let error: { statusCode: number; body: string } | undefined;
      try {
        // @ts-ignore body is a read-only property
        mockRequest.body = { jobParams: rison.encode(null) };
        requestHandler.getJobParams();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
    });

    test('handles invalid rison', () => {
      let error: { statusCode: number; body: string } | undefined;
      // @ts-ignore body is a read-only property
      mockRequest.body = { jobParams: mockJobParams };
      try {
        requestHandler.getJobParams();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
    });
  });

  describe('getSchedule', () => {
    test('parse schedule from body', () => {
      // @ts-ignore body is a read-only property
      mockRequest.body = {
        jobParams: rison.encode(mockJobParams),
        schedule: { rrule: { freq: 1, interval: 2 } },
      };
      expect(requestHandler.getSchedule()).toEqual({ rrule: { freq: 1, interval: 2 } });
    });

    test('parse schedule with dtstart from body', () => {
      // @ts-ignore body is a read-only property
      mockRequest.body = {
        jobParams: rison.encode(mockJobParams),
        schedule: { rrule: { dtstart: '2025-06-23T14:17:19.765Z', freq: 1, interval: 2 } },
      };
      expect(requestHandler.getSchedule()).toEqual({
        rrule: { dtstart: '2025-06-23T14:17:19.765Z', freq: 1, interval: 2 },
      });
    });

    test('handles invalid rrule.dtstart string', () => {
      let error: { statusCode: number; body: string } | undefined;
      try {
        // @ts-ignore body is a read-only property
        mockRequest.body = {
          jobParams: rison.encode(mockJobParams),
          schedule: { rrule: { dtstart: 'i am not a date', freq: 1, interval: 2 } },
        };
        requestHandler.getSchedule();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
      expect(error?.body).toBe('Invalid startedAt date: i am not a date');
    });

    test('handles missing schedule', () => {
      let error: { statusCode: number; body: string } | undefined;
      try {
        // @ts-ignore body is a read-only property
        mockRequest.body = {
          jobParams: rison.encode(mockJobParams),
        };
        requestHandler.getSchedule();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
      expect(error?.body).toBe('A schedule is required to create a scheduled report.');
    });

    test('handles null schedule', () => {
      let error: { statusCode: number; body: string } | undefined;
      try {
        // @ts-ignore body is a read-only property
        mockRequest.body = {
          jobParams: rison.encode(mockJobParams),
          schedule: null,
        };
        requestHandler.getSchedule();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
      expect(error?.body).toBe('A schedule is required to create a scheduled report.');
    });

    test('handles empty schedule', () => {
      let error: { statusCode: number; body: string } | undefined;
      try {
        // @ts-ignore body is a read-only property
        mockRequest.body = {
          jobParams: rison.encode(mockJobParams),
          schedule: {},
        };
        requestHandler.getSchedule();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
      expect(error?.body).toBe('A schedule is required to create a scheduled report.');
    });

    test('handles null rrule schedule', () => {
      let error: { statusCode: number; body: string } | undefined;
      try {
        // @ts-ignore body is a read-only property
        mockRequest.body = {
          jobParams: rison.encode(mockJobParams),
          schedule: { rrule: null },
        };
        requestHandler.getSchedule();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
      expect(error?.body).toBe('A schedule is required to create a scheduled report.');
    });

    test('handles empty rrule schedule', () => {
      let error: { statusCode: number; body: string } | undefined;
      try {
        // @ts-ignore body is a read-only property
        mockRequest.body = {
          jobParams: rison.encode(mockJobParams),
          schedule: { rrule: {} },
        };
        requestHandler.getSchedule();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
      expect(error?.body).toBe('A schedule is required to create a scheduled report.');
    });
  });

  describe('getNotification', () => {
    test('parse notification from body', () => {
      // @ts-ignore body is a read-only property
      mockRequest.body = {
        jobParams: rison.encode(mockJobParams),
        schedule: { rrule: { freq: 1, interval: 2 } },
        notification: { email: { to: ['a@b.com'] } },
      };
      expect(requestHandler.getNotification()).toEqual({ email: { to: ['a@b.com'] } });
    });

    test('parse notification from body when no to defined', () => {
      // @ts-ignore body is a read-only property
      mockRequest.body = {
        jobParams: rison.encode(mockJobParams),
        schedule: { rrule: { freq: 1, interval: 2 } },
        notification: { email: { bcc: ['a@b.com'] } },
      };
      expect(requestHandler.getNotification()).toEqual({ email: { bcc: ['a@b.com'] } });
    });

    test('returns undefined if notification object is empty', () => {
      // @ts-ignore body is a read-only property
      mockRequest.body = {
        jobParams: rison.encode(mockJobParams),
        schedule: { rrule: { freq: 1, interval: 2 } },
        notification: {},
      };
      expect(requestHandler.getNotification()).toBeUndefined();
    });

    test('returns undefined if notification object is null', () => {
      // @ts-ignore body is a read-only property
      mockRequest.body = {
        jobParams: rison.encode(mockJobParams),
        schedule: { rrule: { freq: 1, interval: 2 } },
        notification: null,
      };
      expect(requestHandler.getNotification()).toBeUndefined();
    });

    test('returns undefined if notification.email object is empty', () => {
      // @ts-ignore body is a read-only property
      mockRequest.body = {
        jobParams: rison.encode(mockJobParams),
        schedule: { rrule: { freq: 1, interval: 2 } },
        notification: { email: {} },
      };
      expect(requestHandler.getNotification()).toBeUndefined();
    });

    test('returns undefined if notification.email arrays are all empty', () => {
      // @ts-ignore body is a read-only property
      mockRequest.body = {
        jobParams: rison.encode(mockJobParams),
        schedule: { rrule: { freq: 1, interval: 2 } },
        notification: { email: { to: [], cc: [], bcc: [] } },
      };
      expect(requestHandler.getNotification()).toBeUndefined();
    });

    test('returns undefined if notification.email object is null', () => {
      // @ts-ignore body is a read-only property
      mockRequest.body = {
        jobParams: rison.encode(mockJobParams),
        schedule: { rrule: { freq: 1, interval: 2 } },
        notification: { email: null },
      };
      expect(requestHandler.getNotification()).toBeUndefined();
    });

    test('handles invalid email address', () => {
      jest
        .spyOn(reportingCore, 'validateNotificationEmails')
        .mockReturnValueOnce('not valid emails: foo');
      let error: { statusCode: number; body: string } | undefined;
      try {
        // @ts-ignore body is a read-only property
        mockRequest.body = {
          jobParams: rison.encode(mockJobParams),
          schedule: { rrule: { freq: 1, interval: 2 } },
          notification: { email: { to: ['foo'] } },
        };
        requestHandler.getNotification();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
      expect(error?.body).toBe('Invalid email address(es): not valid emails: foo');
    });

    test('handles too many recipients', () => {
      let error: { statusCode: number; body: string } | undefined;
      try {
        // @ts-ignore body is a read-only property
        mockRequest.body = {
          jobParams: rison.encode(mockJobParams),
          schedule: { rrule: { freq: 1, interval: 2 } },
          notification: {
            email: {
              to: [
                '1@elastic.co',
                '2@elastic.co',
                '3@elastic.co',
                '4@elastic.co',
                '5@elastic.co',
                '6@elastic.co',
                '7@elastic.co',
              ],
              cc: [
                '8@elastic.co',
                '9@elastic.co',
                '10@elastic.co',
                '11@elastic.co',
                '12@elastic.co',
                '13@elastic.co',
                '14@elastic.co',
                '15@elastic.co',
                '16@elastic.co',
                '17@elastic.co',
              ],
              bcc: [
                '18@elastic.co',
                '19@elastic.co',
                '20@elastic.co',
                '21@elastic.co',
                '22@elastic.co',
                '23@elastic.co',
                '24@elastic.co',
                '25@elastic.co',
                '26@elastic.co',
                '27@elastic.co',
                '28@elastic.co',
                '29@elastic.co',
                '30@elastic.co',
                '31@elastic.co',
              ],
            },
          },
        };
        requestHandler.getNotification();
      } catch (err) {
        error = err;
      }

      expect(error?.statusCode).toBe(400);
      expect(error?.body).toBe(
        'Maximum number of recipients exceeded: cannot specify more than 30 recipients.'
      );
    });
  });

  describe('handleRequest', () => {
    test('disallows invalid export type', async () => {
      expect(
        await requestHandler.handleRequest({
          exportTypeId: 'neanderthals',
          jobParams: mockJobParams,
        })
      ).toMatchInlineSnapshot(`
              Object {
                "body": "Invalid export-type of neanderthals",
              }
          `);
    });

    test('disallows unsupporting license', async () => {
      (reportingCore.getLicenseInfo as jest.Mock) = jest.fn(() => ({
        scheduledReports: {
          enableLinks: false,
          message: `seeing this means the license isn't supported`,
        },
      }));

      expect(
        await requestHandler.handleRequest({
          exportTypeId: 'csv_searchsource',
          jobParams: mockJobParams,
        })
      ).toMatchInlineSnapshot(`
              Object {
                "body": "seeing this means the license isn't supported",
              }
          `);
    });

    test('disallows invalid browser timezone', async () => {
      const handler = new ScheduleRequestHandler({
        reporting: reportingCore,
        user: { username: 'testymcgee' } as ReportingUser,
        context: mockContext,
        path: '/api/reporting/test/generate/pdf',
        req: {
          ...mockRequest,
          query: {},
          params: { exportType: 'printablePdfV2' },
          body: {
            schedule: { rrule: { freq: 1, interval: 2, tzid: 'America/Amsterdam' } },
            jobParams: rison.encode({
              ...mockJobParams,
              browserTimezone: 'America/Amsterdam',
            }),
          },
        },
        res: mockResponseFactory,
        logger: mockLogger,
      });
      try {
        await handler.getJobParams();
      } catch (err) {
        expect(err.statusCode).toBe(400);
        expect(err.body).toMatchInlineSnapshot(`
          "invalid params: [
            {
              \\"code\\": \\"custom\\",
              \\"message\\": \\"Invalid timezone\\",
              \\"path\\": [
                \\"browserTimezone\\"
              ]
            }
          ]"
        `);
      }
    });

    test('disallows scheduling when user is undefined', async () => {
      requestHandler = new ScheduleRequestHandler({
        reporting: reportingCore,
        user: undefined,
        context: mockContext,
        path: '/api/reporting/test/generate/pdf',
        // @ts-ignore
        req: mockRequest,
        res: mockResponseFactory,
        logger: mockLogger,
      });
      expect(
        await requestHandler.handleRequest({
          exportTypeId: 'csv_searchsource',
          jobParams: mockJobParams,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "body": "User must be authenticated to schedule a report",
        }
      `);
    });

    test('disallows scheduling when reportingHealth.hasPermanentEncryptionKey = false', async () => {
      jest.spyOn(reportingCore, 'getHealthInfo').mockResolvedValueOnce({
        isSufficientlySecure: true,
        hasPermanentEncryptionKey: false,
        areNotificationsEnabled: true,
      });

      expect(
        await requestHandler.handleRequest({
          exportTypeId: 'csv_searchsource',
          jobParams: mockJobParams,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "body": "Permanent encryption key must be set for scheduled reporting",
        }
      `);
    });

    test('disallows scheduling when reportingHealth.isSufficientlySecure=false', async () => {
      jest.spyOn(reportingCore, 'getHealthInfo').mockResolvedValueOnce({
        isSufficientlySecure: false,
        hasPermanentEncryptionKey: true,
        areNotificationsEnabled: true,
      });

      expect(
        await requestHandler.handleRequest({
          exportTypeId: 'csv_searchsource',
          jobParams: mockJobParams,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "body": "Security and API keys must be enabled for scheduled reporting",
        }
      `);
    });

    test('handles errors from so client create', async () => {
      soClient.create = jest.fn().mockImplementationOnce(async () => {
        throw new Error('SO create error');
      });

      expect(
        await requestHandler.handleRequest({
          exportTypeId: 'csv_searchsource',
          jobParams: mockJobParams,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "body": "SO create error",
          "statusCode": 500,
        }
      `);

      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'SO create error',
        },
        event: {
          action: 'scheduled_report_schedule',
          category: ['database'],
          outcome: 'failure',
          type: ['creation'],
        },
        kibana: {
          saved_object: {
            id: 'mock-report-id',
            type: 'scheduled_report',
            name: 'cool_title',
          },
        },
        message: 'Failed attempt to create scheduled report [id=mock-report-id] [name=cool_title]',
      });
    });
  });
});
