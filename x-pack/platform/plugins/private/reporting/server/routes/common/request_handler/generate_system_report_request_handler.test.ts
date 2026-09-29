/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

vi.mock('uuid', () => {
      const mocked = { v4: () => 'mock-system-report-id' };
      return { ...mocked, default: mocked };
    });

import {
  kibanaResponseFactory,
  type KibanaRequest,
  type KibanaResponseFactory,
} from '@kbn/core/server';
import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { JobParamsCSV, TaskPayloadCSV } from '@kbn/reporting-export-types-csv-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';

import type { ReportingCore } from '../../..';
import type { ReportingStore } from '../../../lib/store';
import { Report } from '../../../lib/store';
import { createMockPluginStart, createMockReportingCore } from '../../../test_helpers';
import type { ReportingRequestHandlerContext, ReportingSetup, ReportingUser } from '../../../types';

import {
  GenerateSystemReportRequestHandler,
  handleGenerateSystemReportRequest,
  type HandleResponseFunc,
  type GenerateSystemReportRequestParams,
  type InternalReportParams,
} from './generate_system_report_request_handler';

vi.mock('@kbn/reporting-server/crypto', () => {
      const mocked = {
      cryptoFactory: () => ({
        encrypt: () => `hello mock system cypher text`,
      }),
    };
      return { ...mocked, default: mocked };
    });

const getMockContext = () =>
  ({
    core: coreMock.createRequestHandlerContext(),
    reporting: Promise.resolve({} as ReportingSetup),
  } as unknown as ReportingRequestHandlerContext);

const mockLogger = loggingSystemMock.createLogger();

const mockReportParams: InternalReportParams = {
  title: 'system_report_title',
  searchSource: {
    index: '.fleet-agents',
    fields: ['col1', 'col2'],
    query: { query: '', language: 'kuery' },
  },
};

const mockJobParams: JobParamsCSV = {
  browserTimezone: 'UTC',
  title: mockReportParams.title,
  objectType: 'search',
  version: '8.99.0',
  columns: mockReportParams.searchSource.fields as string[],
  searchSource: mockReportParams.searchSource,
};

const mockRequestParams = {
  exportTypeId: 'csv_searchsource',
  jobParams: mockJobParams,
};

const mockUser: ReportingUser = { username: 'system_user' } as ReportingUser;

describe('GenerateSystemReportRequestHandler', () => {
  let reportingCore: ReportingCore;
  let mockContext: ReportingRequestHandlerContext;
  let mockRequest: KibanaRequest;
  let mockResponseFactory: KibanaResponseFactory;
  let mockHandleResponse: HandleResponseFunc;
  let requestHandler: GenerateSystemReportRequestHandler<any, any, any>;

  beforeEach(async () => {
    reportingCore = await createMockReportingCore(createMockConfigSchema({}));
    reportingCore.getStore = () =>
      Promise.resolve({
        addReport: vi
          .fn()
          .mockImplementation(
            (report) => new Report({ ...report, _index: '.reporting-system-index-234' })
          ),
      } as unknown as ReportingStore);

    reportingCore.scheduleTaskWithInternalES = vi.fn().mockResolvedValue({ id: 'mock-task-id' });

    mockRequest = httpServerMock.createKibanaRequest();
    mockResponseFactory = kibanaResponseFactory;
    mockContext = getMockContext();

    mockHandleResponse = vi.fn().mockResolvedValue({ body: 'mock response' });

    requestHandler = new GenerateSystemReportRequestHandler(
      {
        reporting: reportingCore,
        user: mockUser,
        context: mockContext,
        path: '/api/some-plugin/resource/_generateReport',
        req: mockRequest,
        res: mockResponseFactory,
        logger: mockLogger,
      },
      {
        handleResponse: mockHandleResponse,
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Enqueue Job', () => {
    test('creates a system report object to queue', async () => {
      const report = await requestHandler.enqueueJob(mockRequestParams);

      const { _id, created_at, payload, ...snapObj } = report;
      expect(snapObj).toMatchInlineSnapshot(`
        Object {
          "_index": ".reporting-system-index-234",
          "_primary_term": undefined,
          "_seq_no": undefined,
          "attempts": 0,
          "completed_at": undefined,
          "created_by": "system_user",
          "error": undefined,
          "execution_time_ms": undefined,
          "jobtype": "csv_searchsource",
          "kibana_id": undefined,
          "kibana_name": undefined,
          "max_attempts": undefined,
          "meta": Object {
            "isDeprecated": undefined,
            "layout": undefined,
            "objectType": "search",
          },
          "metrics": undefined,
          "migration_version": "7.14.0",
          "output": null,
          "process_expiration": undefined,
          "queue_time_ms": undefined,
          "scheduled_report_id": undefined,
          "space_id": "default",
          "started_at": undefined,
          "status": "pending",
          "timeout": undefined,
        }
      `);
      const { forceNow, ...snapPayload } = payload as TaskPayloadCSV;
      expect(snapPayload).toMatchInlineSnapshot(`
        Object {
          "browserTimezone": "UTC",
          "columns": Array [
            "col1",
            "col2",
          ],
          "headers": "hello mock system cypher text",
          "objectType": "search",
          "pagingStrategy": undefined,
          "searchSource": Object {
            "fields": Array [
              "col1",
              "col2",
            ],
            "index": ".fleet-agents",
            "query": Object {
              "language": "kuery",
              "query": "",
            },
          },
          "spaceId": undefined,
          "title": "system_report_title",
          "version": "8.99.0",
        }
      `);
    });

    test('uses scheduleTaskWithInternalES for system reports', async () => {
      await requestHandler.enqueueJob(mockRequestParams);

      expect(reportingCore.scheduleTaskWithInternalES).toHaveBeenCalledWith(
        mockRequest,
        expect.any(Object)
      );
    });

    test('logs correct message about internal ES client', async () => {
      await requestHandler.enqueueJob(mockRequestParams);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'Scheduled csv_searchsource reporting task using internal ES client. Task ID: task:mock-task-id. Report ID: mock-system-report-id'
        ),
        expect.objectContaining({ tags: expect.arrayContaining([expect.any(String)]) })
      );
    });
  });

  describe('handleRequest', () => {
    test('disallows unsupported export type', async () => {
      const response = await requestHandler.handleRequest({
        exportTypeId: 'invalid_system_type',
        jobParams: mockJobParams,
      });

      expect(response.status).toBe(400);
      expect(response.payload).toBe(
        'Unsupported export-type of invalid_system_type for system report'
      );
    });

    test('disallows unsupporting license', async () => {
      (reportingCore.getLicenseInfo as Mock) = vi.fn(() => ({
        csv_searchsource: {
          enableLinks: false,
          message: `seeing this means the license isn't supported`,
        },
      }));

      const response = await requestHandler.handleRequest(mockRequestParams);

      expect(response.payload).toBe("seeing this means the license isn't supported");
      expect(response.status).toBe(403);
    });

    test('disallows unsupported index', async () => {
      const response = await requestHandler.handleRequest({
        ...mockRequestParams,
        jobParams: {
          ...mockJobParams,
          searchSource: {
            ...mockJobParams.searchSource,
            index: 'unsupported-index-*',
          },
        },
      });

      expect(response.status).toBe(400);
      expect(response.payload).toBe('Unsupported index of unsupported-index-* for system report');
    });

    test('successfully handles system report request', async () => {
      await requestHandler.handleRequest(mockRequestParams);

      expect(mockHandleResponse).toHaveBeenCalledWith({
        report: expect.any(Report),
        downloadUrl: expect.stringMatching(
          /\/api\/reporting\/jobs\/download\/mock-system-report-id$/
        ),
      });
    });

    test('handles errors during job enqueuing', async () => {
      const mockError = new Error('System report enqueue error');
      vi.spyOn(requestHandler, 'enqueueJob').mockRejectedValueOnce(mockError);

      await requestHandler.handleRequest(mockRequestParams);

      expect(mockHandleResponse).toHaveBeenCalledWith(null, mockError);
    });
  });
});

describe('handleGenerateSystemReportRequest', () => {
  let reportingCore: ReportingCore;
  let mockContext: ReportingRequestHandlerContext;
  let mockRequest: KibanaRequest;
  let mockResponseFactory: Mocked<KibanaResponseFactory>;
  let mockHandleResponse: HandleResponseFunc;
  let requestParams: GenerateSystemReportRequestParams<any, any, any>;

  beforeEach(async () => {
    const mockReportingConfig = createMockConfigSchema({});
    const mockPluginStartDeps = await createMockPluginStart(
      {
        securityService: {
          authc: {
            getCurrentUser: vi.fn().mockReturnValue(mockUser),
          },
        },
      },
      mockReportingConfig
    );

    reportingCore = await createMockReportingCore(
      mockReportingConfig,
      undefined,
      mockPluginStartDeps
    );
    reportingCore.getStore = () =>
      Promise.resolve({
        addReport: vi
          .fn()
          .mockImplementation(
            (report) => new Report({ ...report, _index: '.reporting-system-index-234' })
          ),
      } as unknown as ReportingStore);

    reportingCore.scheduleTaskWithInternalES = vi.fn().mockResolvedValue({ id: 'mock-task-id' });

    mockRequest = httpServerMock.createKibanaRequest();
    mockResponseFactory = httpServerMock.createResponseFactory();

    mockContext = getMockContext();
    mockHandleResponse = vi.fn().mockResolvedValue({ body: 'mock response' });

    requestParams = {
      reportParams: mockReportParams,
      request: mockRequest,
      response: mockResponseFactory,
      context: mockContext,
    };
  });

  test('returns unauthorized when user is not authenticated', async () => {
    const mockSecurityService = {
      authc: {
        getCurrentUser: vi.fn().mockReturnValue(null),
      },
    };
    reportingCore.getPluginStartDeps = vi.fn().mockResolvedValue({
      securityService: mockSecurityService,
    });

    await handleGenerateSystemReportRequest(
      reportingCore,
      mockLogger,
      '/api/some-plugin/resource/_generateReport',
      requestParams,
      mockHandleResponse
    );

    expect(mockResponseFactory.customError).toHaveBeenCalledWith({
      body: `Sorry, you aren't authenticated`,
      statusCode: 401,
    });
  });

  test('successfully processes authenticated system report request', async () => {
    await handleGenerateSystemReportRequest(
      reportingCore,
      mockLogger,
      '/api/some-plugin/resource/_generateReport',
      requestParams,
      mockHandleResponse
    );

    expect(mockHandleResponse).toHaveBeenCalledWith({
      report: expect.any(Report),
      downloadUrl: expect.stringMatching(
        /\/api\/reporting\/jobs\/download\/mock-system-report-id$/
      ),
    });
  });

  test('handles errors during system report generation', async () => {
    const mockError = new Error('System generation error');
    reportingCore.scheduleTaskWithInternalES = vi.fn().mockRejectedValueOnce(mockError);

    await handleGenerateSystemReportRequest(
      reportingCore,
      mockLogger,
      '/api/some-plugin/resource/_generateReport',
      requestParams,
      mockHandleResponse
    );

    expect(mockHandleResponse).toHaveBeenCalledWith(null, expect.any(Error));
  });
});
