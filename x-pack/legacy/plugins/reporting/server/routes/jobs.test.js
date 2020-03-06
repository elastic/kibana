/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { memoize } from 'lodash';
import { createMockReportingCore } from '../../test_helpers';
import { ExportTypesRegistry } from '../lib/export_types_registry';

jest.mock('./lib/authorized_user_pre_routing', () => ({
  authorizedUserPreRoutingFactory: () => () => ({}),
}));
jest.mock('./lib/reporting_feature_pre_routing', () => ({
  reportingFeaturePreRoutingFactory: () => () => () => ({
    jobTypes: ['unencodedJobType', 'base64EncodedJobType'],
  }),
}));

import { registerJobInfoRoutes } from './jobs';

let mockServer;
let exportTypesRegistry;
let mockReportingPlugin;
const mockLogger = {
  error: jest.fn(),
  debug: jest.fn(),
};

beforeEach(async () => {
  mockServer = new Hapi.Server({ debug: false, port: 8080, routes: { log: { collect: true } } });
  mockServer.config = memoize(() => ({ get: jest.fn() }));
  exportTypesRegistry = new ExportTypesRegistry();
  exportTypesRegistry.register({
    id: 'unencoded',
    jobType: 'unencodedJobType',
    jobContentExtension: 'csv',
  });
  exportTypesRegistry.register({
    id: 'base64Encoded',
    jobType: 'base64EncodedJobType',
    jobContentEncoding: 'base64',
    jobContentExtension: 'pdf',
  });
  mockReportingPlugin = await createMockReportingCore();
  mockReportingPlugin.getExportTypesRegistry = () => exportTypesRegistry;
});

const mockPlugins = {
  elasticsearch: {
    adminClient: { callAsInternalUser: jest.fn() },
  },
  security: null,
};

const getHits = (...sources) => {
  return {
    hits: {
      hits: sources.map(source => ({ _source: source })),
    },
  };
};

const getErrorsFromRequest = request =>
  request.logs.filter(log => log.tags.includes('error')).map(log => log.error);

test(`returns 404 if job not found`, async () => {
  mockPlugins.elasticsearch.adminClient = {
    callAsInternalUser: jest.fn().mockReturnValue(Promise.resolve(getHits())),
  };

  registerJobInfoRoutes(mockReportingPlugin, mockServer, mockPlugins, mockLogger);

  const request = {
    method: 'GET',
    url: '/api/reporting/jobs/download/1',
  };

  const response = await mockServer.inject(request);
  const { statusCode } = response;
  expect(statusCode).toBe(404);
});

test(`returns 401 if not valid job type`, async () => {
  mockPlugins.elasticsearch.adminClient = {
    callAsInternalUser: jest
      .fn()
      .mockReturnValue(Promise.resolve(getHits({ jobtype: 'invalidJobType' }))),
  };

  registerJobInfoRoutes(mockReportingPlugin, mockServer, mockPlugins, mockLogger);

  const request = {
    method: 'GET',
    url: '/api/reporting/jobs/download/1',
  };

  const { statusCode } = await mockServer.inject(request);
  expect(statusCode).toBe(401);
});

describe(`when job is incomplete`, () => {
  const getIncompleteResponse = async () => {
    mockPlugins.elasticsearch.adminClient = {
      callAsInternalUser: jest
        .fn()
        .mockReturnValue(
          Promise.resolve(getHits({ jobtype: 'unencodedJobType', status: 'pending' }))
        ),
    };

    registerJobInfoRoutes(mockReportingPlugin, mockServer, mockPlugins, mockLogger);

    const request = {
      method: 'GET',
      url: '/api/reporting/jobs/download/1',
    };

    return await mockServer.inject(request);
  };

  test(`sets statusCode to 503`, async () => {
    const { statusCode } = await getIncompleteResponse();
    expect(statusCode).toBe(503);
  });

  test(`uses status as payload`, async () => {
    const { payload } = await getIncompleteResponse();
    expect(payload).toBe('pending');
  });

  test(`sets content-type header to application/json; charset=utf-8`, async () => {
    const { headers } = await getIncompleteResponse();
    expect(headers['content-type']).toBe('application/json; charset=utf-8');
  });

  test(`sets retry-after header to 30`, async () => {
    const { headers } = await getIncompleteResponse();
    expect(headers['retry-after']).toBe(30);
  });
});

describe(`when job is failed`, () => {
  const getFailedResponse = async () => {
    const hits = getHits({
      jobtype: 'unencodedJobType',
      status: 'failed',
      output: { content: 'job failure message' },
    });
    mockPlugins.elasticsearch.adminClient = {
      callAsInternalUser: jest.fn().mockReturnValue(Promise.resolve(hits)),
    };

    registerJobInfoRoutes(mockReportingPlugin, mockServer, mockPlugins, mockLogger);

    const request = {
      method: 'GET',
      url: '/api/reporting/jobs/download/1',
    };

    return await mockServer.inject(request);
  };

  test(`sets status code to 500`, async () => {
    const { statusCode } = await getFailedResponse();
    expect(statusCode).toBe(500);
  });

  test(`sets content-type header to application/json; charset=utf-8`, async () => {
    const { headers } = await getFailedResponse();
    expect(headers['content-type']).toBe('application/json; charset=utf-8');
  });

  test(`sets the payload.reason to the job content`, async () => {
    const { payload } = await getFailedResponse();
    expect(JSON.parse(payload).reason).toBe('job failure message');
  });
});

describe(`when job is completed`, () => {
  const getCompletedResponse = async ({
    jobType = 'unencodedJobType',
    outputContent = 'job output content',
    outputContentType = 'application/pdf',
    title = '',
  } = {}) => {
    const hits = getHits({
      jobtype: jobType,
      status: 'completed',
      output: { content: outputContent, content_type: outputContentType },
      payload: {
        title,
      },
    });
    mockPlugins.elasticsearch.adminClient = {
      callAsInternalUser: jest.fn().mockReturnValue(Promise.resolve(hits)),
    };

    registerJobInfoRoutes(mockReportingPlugin, mockServer, mockPlugins, mockLogger);

    const request = {
      method: 'GET',
      url: '/api/reporting/jobs/download/1',
    };

    return await mockServer.inject(request);
  };

  test(`sets statusCode to 200`, async () => {
    const { statusCode, request } = await getCompletedResponse();
    const errorLogs = getErrorsFromRequest(request);
    expect(errorLogs).toEqual([]);
    expect(statusCode).toBe(200);
  });

  test(`doesn't encode output content for not-specified jobTypes`, async () => {
    const { payload, request } = await getCompletedResponse({
      jobType: 'unencodedJobType',
      outputContent: 'test',
    });

    const errorLogs = getErrorsFromRequest(request);
    expect(errorLogs).toEqual([]);

    expect(payload).toBe('test');
  });

  test(`base64 encodes output content for configured jobTypes`, async () => {
    const { payload, request } = await getCompletedResponse({
      jobType: 'base64EncodedJobType',
      outputContent: 'test',
    });

    const errorLogs = getErrorsFromRequest(request);
    expect(errorLogs).toEqual([]);

    expect(payload).toBe(Buffer.from('test', 'base64').toString());
  });

  test(`specifies text/csv; charset=utf-8 contentType header from the job output`, async () => {
    const { headers, request } = await getCompletedResponse({ outputContentType: 'text/csv' });

    const errorLogs = getErrorsFromRequest(request);
    expect(errorLogs).toEqual([]);

    expect(headers['content-type']).toBe('text/csv; charset=utf-8');
  });

  test(`specifies default filename in content-disposition header if no title`, async () => {
    const { headers, request } = await getCompletedResponse({});
    const errorLogs = getErrorsFromRequest(request);
    expect(errorLogs).toEqual([]);
    expect(headers['content-disposition']).toBe('inline; filename="report.csv"');
  });

  test(`specifies payload title in content-disposition header`, async () => {
    const { headers, request } = await getCompletedResponse({ title: 'something' });
    const errorLogs = getErrorsFromRequest(request);
    expect(errorLogs).toEqual([]);
    expect(headers['content-disposition']).toBe('inline; filename="something.csv"');
  });

  test(`specifies jobContentExtension in content-disposition header`, async () => {
    const { headers, request } = await getCompletedResponse({ jobType: 'base64EncodedJobType' });
    const errorLogs = getErrorsFromRequest(request);
    expect(errorLogs).toEqual([]);
    expect(headers['content-disposition']).toBe('inline; filename="report.pdf"');
  });

  test(`specifies application/pdf contentType header from the job output`, async () => {
    const { headers, request } = await getCompletedResponse({
      outputContentType: 'application/pdf',
    });
    const errorLogs = getErrorsFromRequest(request);
    expect(errorLogs).toEqual([]);
    expect(headers['content-type']).toBe('application/pdf');
  });

  describe(`when non-whitelisted contentType specified in job output`, () => {
    test(`sets statusCode to 500`, async () => {
      const { statusCode, request } = await getCompletedResponse({
        outputContentType: 'application/html',
      });
      const errorLogs = getErrorsFromRequest(request);
      expect(errorLogs).toMatchInlineSnapshot(`
        Array [
          [Error: Unsupported content-type of application/html specified by job output],
          [Error: Unsupported content-type of application/html specified by job output],
        ]
      `);
      expect(statusCode).toBe(500);
    });

    test(`doesn't include job output content in payload`, async () => {
      const { payload, request } = await getCompletedResponse({
        outputContentType: 'application/html',
      });
      expect(payload).toMatchInlineSnapshot(
        `"{\\"statusCode\\":500,\\"error\\":\\"Internal Server Error\\",\\"message\\":\\"An internal server error occurred\\"}"`
      );
      const errorLogs = getErrorsFromRequest(request);
      expect(errorLogs).toMatchInlineSnapshot(`
        Array [
          [Error: Unsupported content-type of application/html specified by job output],
          [Error: Unsupported content-type of application/html specified by job output],
        ]
      `);
    });

    test(`logs error message about invalid content type`, async () => {
      const { request } = await getCompletedResponse({ outputContentType: 'application/html' });
      const errorLogs = getErrorsFromRequest(request);
      expect(errorLogs).toMatchInlineSnapshot(`
        Array [
          [Error: Unsupported content-type of application/html specified by job output],
          [Error: Unsupported content-type of application/html specified by job output],
        ]
      `);
    });
  });
});
