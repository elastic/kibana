/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { difference, memoize } from 'lodash';
import { registerJobs } from './jobs';
import { ExportTypesRegistry } from '../../common/export_types_registry';
jest.mock('./lib/authorized_user_pre_routing', () => {
  return {
    authorizedUserPreRoutingFactory: () => () => ({}),
  };
});
jest.mock('./lib/reporting_feature_pre_routing', () => {
  return {
    reportingFeaturePreRoutingFactory: () => () => () => ({
      jobTypes: ['unencodedJobType', 'base64EncodedJobType'],
    }),
  };
});

let mockServer;

beforeEach(() => {
  mockServer = new Hapi.Server({ debug: false, port: 8080, routes: { log: { collect: true } } });
  mockServer.config = memoize(() => ({ get: jest.fn() }));
  const exportTypesRegistry = new ExportTypesRegistry();
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
  mockServer.plugins = {
    elasticsearch: {
      getCluster: memoize(() => ({ callWithInternalUser: jest.fn() })),
      createCluster: () => ({
        callWithRequest: jest.fn(),
        callWithInternalUser: jest.fn(),
      }),
    },
    reporting: {
      exportTypesRegistry,
    },
  };
});

const getHits = (...sources) => {
  return {
    hits: {
      hits: sources.map(source => ({ _source: source })),
    },
  };
};

test(`returns 404 if job not found`, async () => {
  mockServer.plugins.elasticsearch
    .getCluster('admin')
    .callWithInternalUser.mockReturnValue(Promise.resolve(getHits()));

  registerJobs(mockServer);

  const request = {
    method: 'GET',
    url: '/api/reporting/jobs/download/1',
  };

  const response = await mockServer.inject(request);
  const { statusCode } = response;
  expect(statusCode).toBe(404);
});

test(`returns 401 if not valid job type`, async () => {
  mockServer.plugins.elasticsearch
    .getCluster('admin')
    .callWithInternalUser.mockReturnValue(Promise.resolve(getHits({ jobtype: 'invalidJobType' })));

  registerJobs(mockServer);

  const request = {
    method: 'GET',
    url: '/api/reporting/jobs/download/1',
  };

  const { statusCode } = await mockServer.inject(request);
  expect(statusCode).toBe(401);
});

describe(`when job is incomplete`, () => {
  const getIncompleteResponse = async () => {
    mockServer.plugins.elasticsearch
      .getCluster('admin')
      .callWithInternalUser.mockReturnValue(
        Promise.resolve(getHits({ jobtype: 'unencodedJobType', status: 'pending' }))
      );

    registerJobs(mockServer);

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
    mockServer.plugins.elasticsearch
      .getCluster('admin')
      .callWithInternalUser.mockReturnValue(Promise.resolve(hits));

    registerJobs(mockServer);

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
    mockServer.plugins.elasticsearch
      .getCluster('admin')
      .callWithInternalUser.mockReturnValue(Promise.resolve(hits));

    registerJobs(mockServer);

    const request = {
      method: 'GET',
      url: '/api/reporting/jobs/download/1',
    };

    return await mockServer.inject(request);
  };

  test(`sets statusCode to 200`, async () => {
    const { statusCode } = await getCompletedResponse();
    expect(statusCode).toBe(200);
  });

  test(`doesn't encode output content for not-specified jobTypes`, async () => {
    const { payload } = await getCompletedResponse({
      jobType: 'unencodedJobType',
      outputContent: 'test',
    });
    expect(payload).toBe('test');
  });

  test(`base64 encodes output content for configured jobTypes`, async () => {
    const { payload } = await getCompletedResponse({
      jobType: 'base64EncodedJobType',
      outputContent: 'test',
    });
    expect(payload).toBe(Buffer.from('test', 'base64').toString());
  });

  test(`specifies text/csv; charset=utf-8 contentType header from the job output`, async () => {
    const { headers } = await getCompletedResponse({ outputContentType: 'text/csv' });
    expect(headers['content-type']).toBe('text/csv; charset=utf-8');
  });

  test(`specifies default filename in content-disposition header if no title`, async () => {
    const { headers } = await getCompletedResponse({});
    expect(headers['content-disposition']).toBe('inline; filename="report.csv"');
  });

  test(`specifies payload title in content-disposition header`, async () => {
    const { headers } = await getCompletedResponse({ title: 'something' });
    expect(headers['content-disposition']).toBe('inline; filename="something.csv"');
  });

  test(`specifies jobContentExtension in content-disposition header`, async () => {
    const { headers } = await getCompletedResponse({ jobType: 'base64EncodedJobType' });
    expect(headers['content-disposition']).toBe('inline; filename="report.pdf"');
  });

  test(`specifies application/pdf contentType header from the job output`, async () => {
    const { headers } = await getCompletedResponse({ outputContentType: 'application/pdf' });
    expect(headers['content-type']).toBe('application/pdf');
  });

  describe(`when non-whitelisted contentType specified in job output`, () => {
    test(`sets statusCode to 500`, async () => {
      const { statusCode } = await getCompletedResponse({ outputContentType: 'application/html' });
      expect(statusCode).toBe(500);
    });

    test(`doesn't include job output content in payload`, async () => {
      const { payload } = await getCompletedResponse({ outputContentType: 'application/html' });
      expect(payload).not.toMatch(/job output content/);
    });

    test(`logs error message about invalid content type`, async () => {
      const {
        request: { logs },
      } = await getCompletedResponse({ outputContentType: 'application/html' });
      const errorLogs = logs.filter(
        log => difference(['internal', 'implementation', 'error'], log.tags).length === 0
      );
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].error).toBeInstanceOf(Error);
      expect(errorLogs[0].error.message).toMatch(/Unsupported content-type of application\/html/);
    });
  });
});
