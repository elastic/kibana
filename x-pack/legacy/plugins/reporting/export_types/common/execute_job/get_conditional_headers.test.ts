/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockReportingCore, createMockServer } from '../../../test_helpers';
import { ReportingCore } from '../../../server';
import { JobDocPayload } from '../../../types';
import { JobDocPayloadPDF } from '../../printable_pdf/types';
import { getConditionalHeaders, getCustomLogo } from './index';

let mockReportingPlugin: ReportingCore;
let mockServer: any;
beforeEach(async () => {
  mockReportingPlugin = await createMockReportingCore();
  mockServer = createMockServer('');
});

describe('conditions', () => {
  test(`uses hostname from reporting config if set`, async () => {
    const settings: any = {
      'xpack.reporting.kibanaServer.hostname': 'custom-hostname',
    };

    mockServer = createMockServer({ settings });

    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const conditionalHeaders = await getConditionalHeaders({
      job: {} as JobDocPayload<any>,
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.hostname).toEqual(
      mockServer.config().get('xpack.reporting.kibanaServer.hostname')
    );
  });

  test(`uses hostname from server.config if reporting config not set`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const conditionalHeaders = await getConditionalHeaders({
      job: {} as JobDocPayload<any>,
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.hostname).toEqual(mockServer.config().get('server.host'));
  });

  test(`uses port from reporting config if set`, async () => {
    const settings = {
      'xpack.reporting.kibanaServer.port': 443,
    };

    mockServer = createMockServer({ settings });

    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const conditionalHeaders = await getConditionalHeaders({
      job: {} as JobDocPayload<any>,
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.port).toEqual(
      mockServer.config().get('xpack.reporting.kibanaServer.port')
    );
  });

  test(`uses port from server if reporting config not set`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const conditionalHeaders = await getConditionalHeaders({
      job: {} as JobDocPayload<any>,
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.port).toEqual(mockServer.config().get('server.port'));
  });

  test(`uses basePath from server config`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const conditionalHeaders = await getConditionalHeaders({
      job: {} as JobDocPayload<any>,
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.basePath).toEqual(
      mockServer.config().get('server.basePath')
    );
  });

  test(`uses protocol from reporting config if set`, async () => {
    const settings = {
      'xpack.reporting.kibanaServer.protocol': 'https',
    };

    mockServer = createMockServer({ settings });

    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const conditionalHeaders = await getConditionalHeaders({
      job: {} as JobDocPayload<any>,
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.protocol).toEqual(
      mockServer.config().get('xpack.reporting.kibanaServer.protocol')
    );
  });

  test(`uses protocol from server.info`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const conditionalHeaders = await getConditionalHeaders({
      job: {} as JobDocPayload<any>,
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.protocol).toEqual(mockServer.info.protocol);
  });
});

test('uses basePath from job when creating saved object service', async () => {
  const mockGetSavedObjectsClient = jest.fn();
  mockReportingPlugin.getSavedObjectsClient = mockGetSavedObjectsClient;

  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };
  const conditionalHeaders = await getConditionalHeaders({
    job: {} as JobDocPayload<any>,
    filteredHeaders: permittedHeaders,
    server: mockServer,
  });
  const jobBasePath = '/sbp/s/marketing';
  await getCustomLogo({
    reporting: mockReportingPlugin,
    job: { basePath: jobBasePath } as JobDocPayloadPDF,
    conditionalHeaders,
    server: mockServer,
  });

  const getBasePath = mockGetSavedObjectsClient.mock.calls[0][0].getBasePath;
  expect(getBasePath()).toBe(jobBasePath);
});

test(`uses basePath from server if job doesn't have a basePath when creating saved object service`, async () => {
  const mockGetSavedObjectsClient = jest.fn();
  mockReportingPlugin.getSavedObjectsClient = mockGetSavedObjectsClient;

  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };
  const conditionalHeaders = await getConditionalHeaders({
    job: {} as JobDocPayload<any>,
    filteredHeaders: permittedHeaders,
    server: mockServer,
  });

  await getCustomLogo({
    reporting: mockReportingPlugin,
    job: {} as JobDocPayloadPDF,
    conditionalHeaders,
    server: mockServer,
  });

  const getBasePath = mockGetSavedObjectsClient.mock.calls[0][0].getBasePath;
  expect(getBasePath()).toBe(`/sbp`);
  expect(mockGetSavedObjectsClient.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "getBasePath": [Function],
        "headers": Object {
          "baz": "quix",
          "foo": "bar",
        },
        "path": "/",
        "raw": Object {
          "req": Object {
            "url": "/",
          },
        },
        "route": Object {
          "settings": Object {},
        },
        "url": Object {
          "href": "/",
        },
      },
    ]
  `);
});

describe('config formatting', () => {
  test(`lowercases server.host`, async () => {
    mockServer = createMockServer({ settings: { 'server.host': 'COOL-HOSTNAME' } });
    const conditionalHeaders = await getConditionalHeaders({
      job: {} as JobDocPayload<any>,
      filteredHeaders: {},
      server: mockServer,
    });
    expect(conditionalHeaders.conditions.hostname).toEqual('cool-hostname');
  });

  test(`lowercases xpack.reporting.kibanaServer.hostname`, async () => {
    mockServer = createMockServer({
      settings: { 'xpack.reporting.kibanaServer.hostname': 'GREAT-HOSTNAME' },
    });
    const conditionalHeaders = await getConditionalHeaders({
      job: {
        title: 'cool-job-bro',
        type: 'csv',
        jobParams: {
          savedObjectId: 'abc-123',
          isImmediate: false,
          savedObjectType: 'search',
        },
      },
      filteredHeaders: {},
      server: mockServer,
    });
    expect(conditionalHeaders.conditions.hostname).toEqual('great-hostname');
  });
});
