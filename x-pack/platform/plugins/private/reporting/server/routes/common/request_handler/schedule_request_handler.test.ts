/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('uuid', () => ({ v4: () => 'mock-report-id' }));

import rison from '@kbn/rison';

import {
  FakeRawRequest,
  KibanaRequest,
  KibanaResponseFactory,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { JobParamsPDFV2, TaskPayloadPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { ReportingCore } from '../../..';
import { createMockReportingCore } from '../../../test_helpers';
import { ReportingRequestHandlerContext, ReportingSetup } from '../../../types';
import { ScheduleRequestHandler } from './schedule_request_handler';

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

  beforeEach(async () => {
    reportingCore = await createMockReportingCore(createMockConfigSchema({}));

    mockRequest = getMockRequest();

    mockResponseFactory = getMockResponseFactory();
    (mockResponseFactory.ok as jest.Mock) = jest.fn((args: unknown) => args);
    (mockResponseFactory.forbidden as jest.Mock) = jest.fn((args: unknown) => args);
    (mockResponseFactory.badRequest as jest.Mock) = jest.fn((args: unknown) => args);

    mockContext = getMockContext();
    mockContext.reporting = Promise.resolve({} as ReportingSetup);

    soClient = await reportingCore.getSoClient(fakeRawRequest as unknown as KibanaRequest);
    soClient.create = jest.fn().mockImplementation(async (_, opts) => {
      return {
        id: 'foo',
        attributes: opts,
        type: 'scheduled-report',
      };
    });

    requestHandler = new ScheduleRequestHandler({
      reporting: reportingCore,
      user: { username: 'testymcgee' },
      context: mockContext,
      path: '/api/reporting/test/generate/pdf',
      // @ts-ignore
      req: mockRequest,
      res: mockResponseFactory,
      logger: mockLogger,
    });
  });

  describe('enqueueJob', () => {
    test('creates a scheduled report saved object', async () => {
      const report = await requestHandler.enqueueJob({
        exportTypeId: 'printablePdfV2',
        jobParams: mockJobParams,
        schedule: { rrule: { freq: 1, interval: 2, tzid: 'UTC' } },
      });

      const { id, created_at: _created_at, payload, ...snapObj } = report;
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
          "schedule": Object {
            "rrule": Object {
              "freq": 1,
              "interval": 2,
              "tzid": "UTC",
            },
          },
        }
      `);
      const { forceNow, ...snapPayload } = payload as TaskPayloadPDFV2;
      expect(snapPayload).toMatchInlineSnapshot(`
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

      expect(soClient.create).toHaveBeenCalledWith(
        'scheduled_report',
        {
          jobType: 'printable_pdf_v2',
          createdAt: expect.any(String),
          createdBy: 'testymcgee',
          title: 'cool_title',
          payload: expect.any(String),
          schedule: {
            rrule: {
              freq: 1,
              interval: 2,
            },
          },
          migrationVersion: 'unknown',
          meta: {
            objectType: 'cool_object_type',
            layout: 'preserve_layout',
            isDeprecated: false,
          },
        },
        {}
      );
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
        csv_searchsource: {
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
      expect(
        await requestHandler.handleRequest({
          exportTypeId: 'csv_searchsource',
          jobParams: {
            ...mockJobParams,
            browserTimezone: 'America/Amsterdam',
          },
        })
      ).toMatchInlineSnapshot(`
        Object {
          "body": "Invalid timezone \\"America/Amsterdam\\".",
        }
      `);
    });

    test('disallows scheduling when reportingHealth.hasPermanentEncryptionKey = false', async () => {
      jest.spyOn(reportingCore, 'getHealthInfo').mockResolvedValue({
        isSufficientlySecure: true,
        hasPermanentEncryptionKey: false,
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
      jest.spyOn(reportingCore, 'getHealthInfo').mockResolvedValue({
        isSufficientlySecure: false,
        hasPermanentEncryptionKey: true,
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
  });
});
