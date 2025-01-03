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

import { estypes } from '@elastic/elasticsearch';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import { ElasticsearchClientMock, coreMock } from '@kbn/core/server/mocks';
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
import { ReportingRequestHandlerContext } from '../../../../types';
import { EventTracker } from '../../../../usage';
import { STATUS_CODES } from '../../../common/jobs/constants';
import { registerJobInfoRoutesInternal as registerJobInfoRoutes } from '../jobs';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

describe(`Reporting Job Management Routes: Internal`, () => {
  const reportingSymbol = Symbol('reporting');
  let server: SetupServerReturn['server'];
  let eventTracker: EventTracker;
  let usageCounter: IUsageCounter;
  let httpSetup: SetupServerReturn['httpSetup'];
  let exportTypesRegistry: ExportTypesRegistry;
  let reportingCore: ReportingCore;
  let mockSetupDeps: ReportingInternalSetup;
  let mockStartDeps: ReportingInternalStart;
  let mockEsClient: ElasticsearchClientMock;
  let stream: jest.Mocked<ContentStream>;

  const getHits = (...sources: any) => {
    return {
      hits: {
        hits: sources.map((source: object) => ({ _source: source })),
      },
    } as estypes.SearchResponseBody;
  };

  const mockJobTypeUnencoded = 'unencodedJobType';
  const mockJobTypeBase64Encoded = 'base64EncodedJobType';
  const getCompleteHits = ({
    jobType = mockJobTypeUnencoded,
    outputContentType = 'text/plain',
    title = '',
  } = {}) => {
    return getHits({
      jobtype: jobType,
      status: 'completed',
      output: { content_type: outputContentType },
      payload: { title },
    }) as estypes.SearchResponseBody;
  };

  const coreSetupMock = coreMock.createSetup();
  const mockConfigSchema = createMockConfigSchema();

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(reportingSymbol));
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
        },
      },
      mockConfigSchema
    );

    reportingCore = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);

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

  describe('download report', () => {
    it('fails on malformed download IDs', async () => {
      mockEsClient.search.mockResponseOnce(getHits());
      registerJobInfoRoutes(reportingCore);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/1`)
        .expect(400)
        .then(({ body }) =>
          expect(body.message).toMatchInlineSnapshot(
            '"[request params.docId]: value has length [1] but it must have a minimum length of [3]."'
          )
        );
    });

    it('fails on unauthenticated users', async () => {
      mockStartDeps = await createMockPluginStart(
        {
          licensing: {
            ...licensingMock.createStart(),
            license$: new BehaviorSubject({ isActive: true, isAvailable: true, type: 'gold' }),
          },
          securityService: { authc: { getCurrentUser: () => undefined } }, // security comes from core here
        },
        mockConfigSchema
      );
      reportingCore = await createMockReportingCore(mockConfigSchema, mockSetupDeps, mockStartDeps);
      registerJobInfoRoutes(reportingCore);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/dope`)
        .expect(401)
        .then(({ body }) =>
          expect(body.message).toMatchInlineSnapshot(`"Sorry, you aren't authenticated"`)
        );
    });

    it('returns 404 if job not found', async () => {
      mockEsClient.search.mockResponseOnce(getHits());
      registerJobInfoRoutes(reportingCore);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/poo`)
        .expect(404);
    });

    it(`returns job's info`, async () => {
      mockEsClient.search.mockResponseOnce(
        getHits({
          jobtype: mockJobTypeBase64Encoded,
          payload: {}, // payload is irrelevant
        })
      );

      registerJobInfoRoutes(reportingCore);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.INFO_PREFIX}/test`)
        .expect(200);
    });

    it('when a job is incomplete, "internal" API endpoint should return appropriate response', async () => {
      mockEsClient.search.mockResponseOnce(
        getHits({
          jobtype: mockJobTypeUnencoded,
          status: 'pending',
          payload: { title: 'incomplete!' },
        })
      );
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
        .expect(STATUS_CODES.PENDING.INTERNAL)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .expect('Retry-After', '30')
        .then(({ text }) => expect(text).toEqual('pending'));
    });

    it('when a job fails, "internal" API endpoint should return appropriate response', async () => {
      mockEsClient.search.mockResponse(
        getHits({
          jobtype: mockJobTypeUnencoded,
          status: 'failed',
          output: { content: 'job failure message' },
          payload: { title: 'failing job!' },
        })
      );
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
        .expect(STATUS_CODES.FAILED.INTERNAL)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .then(({ body }) =>
          expect(body.message).toEqual('Reporting generation failed: job failure message')
        );
    });

    it('when a known job-type is complete', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
        .expect(STATUS_CODES.COMPLETED)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('content-disposition', 'attachment; filename=report.csv');
    });

    it('succeeds when security is not there or disabled', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());

      // @ts-ignore
      reportingCore.pluginSetupDeps.security = null;

      registerJobInfoRoutes(reportingCore);

      await server.start();

      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/dope`)
        .expect(STATUS_CODES.COMPLETED)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('content-disposition', 'attachment; filename=report.csv');
    });

    it('forwards job content stream', async () => {
      mockEsClient.search.mockResponseOnce(
        getCompleteHits({
          jobType: mockJobTypeUnencoded,
        })
      );
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
        .expect(STATUS_CODES.COMPLETED)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .then(({ text }) => expect(text).toEqual('test'));
    });

    it('refuses to return unknown content-types', async () => {
      mockEsClient.search.mockResponseOnce(
        getCompleteHits({
          jobType: mockJobTypeUnencoded,
          outputContentType: 'application/html',
        })
      );
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
        .expect(400)
        .then(({ body }) => {
          expect(body).toEqual({
            error: 'Bad Request',
            message: 'Unsupported content-type of application/html specified by job output',
            statusCode: 400,
          });
        });
    });

    it('allows multi-byte characters in file names', async () => {
      mockEsClient.search.mockResponseOnce(
        getCompleteHits({
          jobType: mockJobTypeBase64Encoded,
          title: '日本語ダッシュボード',
        })
      );
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/japanese-dashboard`)
        .expect(STATUS_CODES.COMPLETED)
        .expect('Content-Type', 'application/pdf')
        .expect(
          'content-disposition',
          'attachment; filename=%E6%97%A5%E6%9C%AC%E8%AA%9E%E3%83%80%E3%83%83%E3%82%B7%E3%83%A5%E3%83%9C%E3%83%BC%E3%83%89.pdf'
        );
    });
  });

  describe('usage counters', () => {
    it('increments the info api counter', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.INFO_PREFIX}/dank`)
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8');

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `get ${INTERNAL_ROUTES.JOBS.INFO_PREFIX}/{docId}:${mockJobTypeUnencoded}`,
        counterType: 'reportingApi',
      });
    });

    it('increments the download api counter', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(`${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`)
        .expect(STATUS_CODES.COMPLETED)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('content-disposition', 'attachment; filename=report.csv');

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `get ${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/{docId}:${mockJobTypeUnencoded}`,
        counterType: 'reportingApi',
      });
    });

    it('increments the delete api counter', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .delete(`${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/dank`)
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8');

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `delete ${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/{docId}:${mockJobTypeUnencoded}`,
        counterType: 'reportingApi',
      });
    });

    it('increments the count api counter', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get(INTERNAL_ROUTES.JOBS.COUNT)
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8');

      expect(usageCounter.incrementCounter).toHaveBeenCalledTimes(1);
      expect(usageCounter.incrementCounter).toHaveBeenCalledWith({
        counterName: `get ${INTERNAL_ROUTES.JOBS.COUNT}`,
        counterType: 'reportingApi',
      });
    });
  });

  describe('delete report', () => {
    it('handles content stream errors', async () => {
      stream = new Readable({
        read() {
          this.push('test');
          this.push(null);
        },
      }) as typeof stream;
      stream.end = jest.fn().mockImplementation((_name, _encoding, callback) => {
        callback(new Error('An error occurred in ending the content stream'));
      });

      (getContentStream as jest.MockedFunction<typeof getContentStream>).mockResolvedValue(stream);
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .delete(`${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/dank`)
        .expect(500)
        .expect('Content-Type', 'application/json; charset=utf-8');
    });
  });

  describe('telemetry', () => {
    it('supports download report event tracking', async () => {
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener).get(
        `${INTERNAL_ROUTES.JOBS.DOWNLOAD_PREFIX}/dank`
      );

      expect(eventTracker.downloadReport).toHaveBeenCalledTimes(1);
    });

    it('supports delete report event tracking', async () => {
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
      mockEsClient.search.mockResponseOnce(getCompleteHits());
      registerJobInfoRoutes(reportingCore);

      await server.start();
      await supertest(httpSetup.server.listener)
        .delete(`${INTERNAL_ROUTES.JOBS.DELETE_PREFIX}/dank`)
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8');

      expect(eventTracker.deleteReport).toHaveBeenCalledTimes(1);
    });
  });
});
