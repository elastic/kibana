/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { createMockReportingCore } from '../../test_helpers';
import { Logger, ServerFacade } from '../../types';
import { ReportingCore, ReportingSetupDeps } from '../../server/types';

jest.mock('./lib/authorized_user_pre_routing', () => ({
  authorizedUserPreRoutingFactory: () => () => ({}),
}));
jest.mock('./lib/reporting_feature_pre_routing', () => ({
  reportingFeaturePreRoutingFactory: () => () => () => ({
    jobTypes: ['unencodedJobType', 'base64EncodedJobType'],
  }),
}));

import { registerJobGenerationRoutes } from './generation';

let mockServer: Hapi.Server;
let mockReportingPlugin: ReportingCore;
const mockLogger = ({
  error: jest.fn(),
  debug: jest.fn(),
} as unknown) as Logger;

beforeEach(async () => {
  mockServer = new Hapi.Server({
    debug: false,
    port: 8080,
    routes: { log: { collect: true } },
  });
  mockServer.config = () => ({ get: jest.fn(), has: jest.fn() });
  mockReportingPlugin = await createMockReportingCore();
  mockReportingPlugin.getEnqueueJob = async () =>
    jest.fn().mockImplementation(() => ({ toJSON: () => '{ "job": "data" }' }));
});

const mockPlugins = {
  elasticsearch: {
    adminClient: { callAsInternalUser: jest.fn() },
  },
  security: null,
};

const getErrorsFromRequest = (request: Hapi.Request) => {
  // @ts-ignore error property doesn't exist on RequestLog
  return request.logs.filter((log) => log.tags.includes('error')).map((log) => log.error); // NOTE: error stack is available
};

test(`returns 400 if there are no job params`, async () => {
  registerJobGenerationRoutes(
    mockReportingPlugin,
    (mockServer as unknown) as ServerFacade,
    (mockPlugins as unknown) as ReportingSetupDeps,
    mockLogger
  );

  const options = {
    method: 'POST',
    url: '/api/reporting/generate/printablePdf',
  };

  const { payload, request } = await mockServer.inject(options);
  expect(payload).toMatchInlineSnapshot(
    `"{\\"statusCode\\":400,\\"error\\":\\"Bad Request\\",\\"message\\":\\"A jobParams RISON string is required\\"}"`
  );

  const errorLogs = getErrorsFromRequest(request);
  expect(errorLogs).toMatchInlineSnapshot(`
    Array [
      [Error: A jobParams RISON string is required],
    ]
  `);
});

test(`returns 400 if job params is invalid`, async () => {
  registerJobGenerationRoutes(
    mockReportingPlugin,
    (mockServer as unknown) as ServerFacade,
    (mockPlugins as unknown) as ReportingSetupDeps,
    mockLogger
  );

  const options = {
    method: 'POST',
    url: '/api/reporting/generate/printablePdf',
    payload: { jobParams: `foo:` },
  };

  const { payload, request } = await mockServer.inject(options);
  expect(payload).toMatchInlineSnapshot(
    `"{\\"statusCode\\":400,\\"error\\":\\"Bad Request\\",\\"message\\":\\"invalid rison: foo:\\"}"`
  );

  const errorLogs = getErrorsFromRequest(request);
  expect(errorLogs).toMatchInlineSnapshot(`
    Array [
      [Error: invalid rison: foo:],
    ]
  `);
});

test(`returns 500 if job handler throws an error`, async () => {
  mockReportingPlugin.getEnqueueJob = async () =>
    jest.fn().mockImplementation(() => ({
      toJSON: () => {
        throw new Error('you found me');
      },
    }));

  registerJobGenerationRoutes(
    mockReportingPlugin,
    (mockServer as unknown) as ServerFacade,
    (mockPlugins as unknown) as ReportingSetupDeps,
    mockLogger
  );

  const options = {
    method: 'POST',
    url: '/api/reporting/generate/printablePdf',
    payload: { jobParams: `abc` },
  };

  const { payload, request } = await mockServer.inject(options);
  expect(payload).toMatchInlineSnapshot(
    `"{\\"statusCode\\":500,\\"error\\":\\"Internal Server Error\\",\\"message\\":\\"An internal server error occurred\\"}"`
  );

  const errorLogs = getErrorsFromRequest(request);
  expect(errorLogs).toMatchInlineSnapshot(`
    Array [
      [Error: you found me],
      [Error: you found me],
    ]
  `);
});
