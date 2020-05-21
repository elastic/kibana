/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import supertest from 'supertest';
import { UnwrapPromise } from '@kbn/utility-types';
import { registerJobInfoRoutes } from './jobs';
import { createMockReportingCore, createMockServer } from '../../test_helpers';
import { ReportingCore } from '..';
import { ExportTypesRegistry } from '../lib/export_types_registry';
import { ExportTypeDefinition, ReportingSetupDeps } from '../types';
import { LevelLogger } from '../lib';
import { IRouter } from 'src/core/server';

type setupServerReturn = UnwrapPromise<ReturnType<typeof createMockServer>>;

describe('GET /api/reporting/jobs/download', () => {
  let server: setupServerReturn['server'];
  let httpSetup: setupServerReturn['httpSetup'];
  let exportTypesRegistry: ExportTypesRegistry;
  let core: ReportingCore;
  let basePath: () => string;
  let router: IRouter;

  const config = { get: jest.fn(), kbnConfig: { get: jest.fn() } };
  const mockLogger = ({
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown) as jest.Mocked<LevelLogger>;

  const mockPlugins = ({
    elasticsearch: {
      adminClient: { callAsInternalUser: jest.fn() },
    },
    security: {
      authc: {
        getCurrentUser: () => ({
          id: '123',
          roles: ['superuser'],
          username: 'Tom Riddle',
        }),
      },
    },
  } as unknown) as ReportingSetupDeps;

  const getHits = (...sources: any) => {
    return {
      hits: {
        hits: sources.map((source: object) => ({ _source: source })),
      },
    };
  };

  beforeEach(async () => {
    basePath = () => '/';
    core = await createMockReportingCore(config);
    // @ts-ignore
    core.license = {
      isActive: true,
      isAvailable: true,
      type: 'gold',
    };
    exportTypesRegistry = new ExportTypesRegistry();
    exportTypesRegistry.register({
      id: 'unencoded',
      jobType: 'unencodedJobType',
      jobContentExtension: 'csv',
      validLicenses: ['basic', 'gold'],
    } as ExportTypeDefinition<unknown, unknown, unknown, unknown>);
    exportTypesRegistry.register({
      id: 'base64Encoded',
      jobType: 'base64EncodedJobType',
      jobContentEncoding: 'base64',
      jobContentExtension: 'pdf',
      validLicenses: ['basic', 'gold'],
    } as ExportTypeDefinition<unknown, unknown, unknown, unknown>);
    core.getExportTypesRegistry = () => exportTypesRegistry;
    ({ server, httpSetup } = await createMockServer());
  });

  afterEach(async () => {
    mockLogger.debug.mockReset();
    mockLogger.error.mockReset();
    await server.stop();
  });

  it('fails on malformed download IDs', async () => {
    // @ts-ignore
    mockPlugins.elasticsearch.adminClient = {
      callAsInternalUser: jest.fn().mockReturnValue(Promise.resolve(getHits())),
    };
    router = httpSetup.createRouter('');
    registerJobInfoRoutes(core, mockPlugins, router, basePath, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/1')
      .expect(400)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(
          '"[request params.docId]: value has length [1] but it must have a minimum length of [3]."'
        )
      );
  });

  it('fails on unauthenticated users', async () => {
    // @ts-ignore
    const unauthenticatedPlugin = ({
      ...mockPlugins,
      security: {
        authc: {
          getCurrentUser: () => undefined,
        },
      },
    } as unknown) as ReportingSetupDeps;
    router = httpSetup.createRouter('');
    registerJobInfoRoutes(core, unauthenticatedPlugin, router, basePath, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/dope')
      .expect(401)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(`"Sorry, you aren't authenticated"`)
      );
  });

  it('fails when security is not there', async () => {
    // @ts-ignore
    const noSecurityPlugins = ({
      ...mockPlugins,
      security: null,
    } as unknown) as ReportingSetupDeps;
    router = httpSetup.createRouter('');
    registerJobInfoRoutes(core, noSecurityPlugins, router, basePath, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/dope')
      .expect(401)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(`"Sorry, you aren't authenticated"`)
      );
  });

  it('fails on users without the appropriate role', async () => {
    // @ts-ignore
    const peasantUser = ({
      ...mockPlugins,
      security: {
        authc: {
          getCurrentUser: () => ({
            id: '123',
            roles: ['peasant'],
            username: 'Tom Riddle',
          }),
        },
      },
    } as unknown) as ReportingSetupDeps;
    router = httpSetup.createRouter('');
    registerJobInfoRoutes(core, peasantUser, router, basePath, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/dope')
      .expect(403)
      .then(({ body }) =>
        expect(body.message).toMatchInlineSnapshot(`"Sorry, you don't have access to Reporting"`)
      );
  });

  it('returns 404 if job not found', async () => {
    // @ts-ignore
    mockPlugins.elasticsearch.adminClient = {
      callAsInternalUser: jest.fn().mockReturnValue(Promise.resolve(getHits())),
    };
    router = httpSetup.createRouter('');
    registerJobInfoRoutes(core, mockPlugins, router, basePath, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/poo')
      .expect(404);
  });

  it('returns a 401 if not a valid job type', async () => {
    // @ts-ignore
    mockPlugins.elasticsearch.adminClient = {
      callAsInternalUser: jest
        .fn()
        .mockReturnValue(Promise.resolve(getHits({ jobtype: 'invalidJobType' }))),
    };
    router = httpSetup.createRouter('');
    registerJobInfoRoutes(core, mockPlugins, router, basePath, mockLogger);

    await server.start();

    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/poo')
      .expect(401);
  });

  it('when a job is incomplete', async () => {
    // @ts-ignore
    mockPlugins.elasticsearch.adminClient = {
      callAsInternalUser: jest
        .fn()
        .mockReturnValue(
          Promise.resolve(getHits({ jobtype: 'unencodedJobType', status: 'pending' }))
        ),
    };
    router = httpSetup.createRouter('');
    registerJobInfoRoutes(core, mockPlugins, router, basePath, mockLogger);

    await server.start();
    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/dank')
      .expect(503)
      .expect('Content-Type', 'text/plain; charset=utf-8')
      .expect('Retry-After', '30')
      .then(({ text }) => expect(text).toEqual('pending'));
  });

  it('when a job fails', async () => {
    // @ts-ignore
    mockPlugins.elasticsearch.adminClient = {
      callAsInternalUser: jest.fn().mockReturnValue(
        Promise.resolve(
          getHits({
            jobtype: 'unencodedJobType',
            status: 'failed',
            output: { content: 'job failure message' },
          })
        )
      ),
    };
    router = httpSetup.createRouter('');
    registerJobInfoRoutes(core, mockPlugins, router, basePath, mockLogger);

    await server.start();
    await supertest(httpSetup.server.listener)
      .get('/api/reporting/jobs/download/dank')
      .expect(500)
      .expect('Content-Type', 'application/json; charset=utf-8')
      .then(({ body }) =>
        expect(body.message).toEqual('Reporting generation failed: job failure message')
      );
  });

  describe('successful downloads', () => {
    const getCompleteHits = async ({
      jobType = 'unencodedJobType',
      outputContent = 'job output content',
      outputContentType = 'text/plain',
      title = '',
    } = {}) => {
      return getHits({
        jobtype: jobType,
        status: 'completed',
        output: { content: outputContent, content_type: outputContentType },
        payload: {
          title,
        },
      });
    };

    it('when a known job-type is complete', async () => {
      const hits = getCompleteHits();
      // @ts-ignore
      mockPlugins.elasticsearch.adminClient = {
        callAsInternalUser: jest.fn().mockReturnValue(Promise.resolve(hits)),
      };
      router = httpSetup.createRouter('');
      registerJobInfoRoutes(core, mockPlugins, router, basePath, mockLogger);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dank')
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .expect('content-disposition', 'inline; filename="report.csv"');
    });

    it(`doesn't encode output-content for non-specified job-types`, async () => {
      const hits = getCompleteHits({
        jobType: 'unencodedJobType',
        outputContent: 'test',
      });
      // @ts-ignore
      mockPlugins.elasticsearch.adminClient = {
        callAsInternalUser: jest.fn().mockReturnValue(Promise.resolve(hits)),
      };
      router = httpSetup.createRouter('');
      registerJobInfoRoutes(core, mockPlugins, router, basePath, mockLogger);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dank')
        .expect(200)
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .then(({ text }) => expect(text).toEqual('test'));
    });

    it(`base64 encodes output content for configured jobTypes`, async () => {
      const hits = getCompleteHits({
        jobType: 'base64EncodedJobType',
        outputContent: 'test',
        outputContentType: 'application/pdf',
      });
      // @ts-ignore
      mockPlugins.elasticsearch.adminClient = {
        callAsInternalUser: jest.fn().mockReturnValue(Promise.resolve(hits)),
      };
      router = httpSetup.createRouter('');
      registerJobInfoRoutes(core, mockPlugins, router, basePath, mockLogger);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dank')
        .expect(200)
        .expect('Content-Type', 'application/pdf')
        .expect('content-disposition', 'inline; filename="report.pdf"')
        .then(({ body }) => expect(Buffer.from(body).toString('base64')).toEqual('test'));
    });

    it('refuses to return unknown content-types', async () => {
      const hits = getCompleteHits({
        jobType: 'unencodedJobType',
        outputContent: 'alert("all your base mine now");',
        outputContentType: 'application/html',
      });
      // @ts-ignore
      mockPlugins.elasticsearch.adminClient = {
        callAsInternalUser: jest.fn().mockReturnValue(Promise.resolve(hits)),
      };
      router = httpSetup.createRouter('');
      registerJobInfoRoutes(core, mockPlugins, router, basePath, mockLogger);

      await server.start();
      await supertest(httpSetup.server.listener)
        .get('/api/reporting/jobs/download/dank')
        .expect(500)
        .then(({ body }) => {
          expect(body).toEqual({
            error: 'Internal Server Error',
            message: 'An internal server error occurred',
            statusCode: 500,
          });
        });
    });
  });
});
