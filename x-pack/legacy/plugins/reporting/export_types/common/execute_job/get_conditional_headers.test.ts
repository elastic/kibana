/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from '../../../test_helpers/create_mock_server';
import { getConditionalHeaders, getCustomLogo } from './index';
import { JobDocPayload } from '../../../types';
import { JobDocPayloadPDF } from '../../printable_pdf/types';

let mockServer: any;
beforeEach(() => {
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

    const { conditionalHeaders } = await getConditionalHeaders({
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

    const { conditionalHeaders } = await getConditionalHeaders({
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

    const { conditionalHeaders } = await getConditionalHeaders({
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

    const { conditionalHeaders } = await getConditionalHeaders({
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

    const { conditionalHeaders } = await getConditionalHeaders({
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

    const { conditionalHeaders } = await getConditionalHeaders({
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

    const { conditionalHeaders } = await getConditionalHeaders({
      job: {} as JobDocPayload<any>,
      filteredHeaders: permittedHeaders,
      server: mockServer,
    });

    expect(conditionalHeaders.conditions.protocol).toEqual(mockServer.info.protocol);
  });
});

test('uses basePath from job when creating saved object service', async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const { conditionalHeaders } = await getConditionalHeaders({
    job: {} as JobDocPayload<any>,
    filteredHeaders: permittedHeaders,
    server: mockServer,
  });

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  const jobBasePath = '/sbp/s/marketing';
  await getCustomLogo({
    job: { basePath: jobBasePath } as JobDocPayloadPDF,
    conditionalHeaders,
    server: mockServer,
  });

  expect(mockServer.savedObjects.getScopedSavedObjectsClient.mock.calls[0][0].getBasePath()).toBe(
    jobBasePath
  );
});

test(`uses basePath from server if job doesn't have a basePath when creating saved object service`, async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const { conditionalHeaders } = await getConditionalHeaders({
    job: {} as JobDocPayload<any>,
    filteredHeaders: permittedHeaders,
    server: mockServer,
  });

  const logo = 'custom-logo';
  mockServer.uiSettingsServiceFactory().get.mockReturnValue(logo);

  await getCustomLogo({
    job: {} as JobDocPayloadPDF,
    conditionalHeaders,
    server: mockServer,
  });

  expect(mockServer.savedObjects.getScopedSavedObjectsClient.mock.calls[0][0].getBasePath()).toBe(
    '/sbp'
  );
});

describe('config formatting', () => {
  test(`lowercases server.host`, async () => {
    mockServer = createMockServer({ settings: { 'server.host': 'COOL-HOSTNAME' } });
    const { conditionalHeaders } = await getConditionalHeaders({
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
    const { conditionalHeaders } = await getConditionalHeaders({
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
