/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { httpServiceMock, httpServerMock } from 'src/core/server/mocks';
import { createTestHapiServer } from '../test_utils';
import { LocalHandlerAdapter } from './local_handler_adapter';
import { CodeServerRouter } from '../security';
import { RequestContext, ServiceHandlerFor } from './service_definition';
import { CodeNodeAdapter, RequestPayload } from './multinode/code_node_adapter';
import { DEFAULT_SERVICE_OPTION } from './service_handler_adapter';
import { NonCodeNodeAdapter } from './multinode/non_code_node_adapter';
import { CodeServices } from './code_services';
import { Logger } from '../log';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);
let hapiServer = createTestHapiServer();

const routerMock = httpServiceMock.createRouter();
let router: CodeServerRouter = new CodeServerRouter(routerMock);
beforeEach(async () => {
  hapiServer = createTestHapiServer();
  router = new CodeServerRouter(routerMock);
});
const TestDefinition = {
  test1: {
    request: {} as { name: string },
    response: {} as { result: string },
  },
  test2: {
    request: {},
    response: {} as RequestContext,
    routePath: 'userDefinedPath',
  },
};

export const testServiceHandler: ServiceHandlerFor<typeof TestDefinition> = {
  async test1({ name }) {
    return { result: `hello ${name}` };
  },
  async test2(_, context: RequestContext) {
    return context;
  },
};

test('local adapter should work', async () => {
  const services = new CodeServices(new LocalHandlerAdapter());
  services.registerHandler(TestDefinition, testServiceHandler);
  const testApi = services.serviceFor(TestDefinition);
  const endpoint = await services.locate(httpServerMock.createKibanaRequest(), '');
  const { result } = await testApi.test1(endpoint, { name: 'tester' });
  expect(result).toBe(`hello tester`);
});

test.skip('multi-node adapter should register routes', async () => {
  const services = new CodeServices(new CodeNodeAdapter(router, log));
  services.registerHandler(TestDefinition, testServiceHandler);
  const prefix = DEFAULT_SERVICE_OPTION.routePrefix;

  const path1 = `${prefix}/test1`;
  const response = await hapiServer.inject({
    method: 'POST',
    url: path1,
    payload: { params: { name: 'tester' } },
  });
  expect(response.statusCode).toBe(200);
  const { data } = JSON.parse(response.payload);
  expect(data.result).toBe(`hello tester`);
});

test.skip('non-code-node could send request to code-node', async () => {
  const codeNode = new CodeServices(new CodeNodeAdapter(router, log));
  const codeNodeUrl = 'http://localhost:5601';
  const nonCodeNodeAdapter = new NonCodeNodeAdapter(codeNodeUrl, log);
  const nonCodeNode = new CodeServices(nonCodeNodeAdapter);
  // replace client request fn to hapi.inject
  nonCodeNodeAdapter.requestFn = async (
    baseUrl: string,
    path: string,
    payload: RequestPayload,
    originRequest: KibanaRequest
  ) => {
    expect(baseUrl).toBe(codeNodeUrl);
    const response = await hapiServer.inject({
      method: 'POST',
      url: path,
      headers: originRequest.headers as any,
      payload,
    });
    expect(response.statusCode).toBe(200);
    return JSON.parse(response.payload);
  };
  codeNode.registerHandler(TestDefinition, testServiceHandler);
  nonCodeNode.registerHandler(TestDefinition, null);
  const testApi = nonCodeNode.serviceFor(TestDefinition);
  const fakeRequest = ({
    route: {
      path: 'fakePath',
    },
    headers: {
      fakeHeader: 'fakeHeaderValue',
    },
  } as unknown) as KibanaRequest;
  const fakeResource = 'fakeResource';
  const endpoint = await nonCodeNode.locate(fakeRequest, fakeResource);
  const { result } = await testApi.test1(endpoint, { name: 'tester' });
  expect(result).toBe(`hello tester`);

  const context = await testApi.test2(endpoint, {});
  expect(context.resource).toBe(fakeResource);
  expect(context.path).toBe(fakeRequest.route.path);
});
