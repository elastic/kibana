/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request, Server } from '@hapi/hapi';
import { createTestHapiServer } from '../test_utils';
import { LocalHandlerAdapter } from './local_handler_adapter';
import { CodeServerRouter } from '../security';
import { RequestContext, ServiceHandlerFor } from './service_definition';
import { CodeNodeAdapter, RequestPayload } from './multinode/code_node_adapter';
import { DEFAULT_SERVICE_OPTION } from './service_handler_adapter';
import { NonCodeNodeAdapter } from './multinode/non_code_node_adapter';
import { CodeServices } from './code_services';
import { Logger } from '../log';

let hapiServer: Server = createTestHapiServer();
const log = new Logger(hapiServer);

let server: CodeServerRouter = new CodeServerRouter(hapiServer);
beforeEach(async () => {
  hapiServer = createTestHapiServer();
  server = new CodeServerRouter(hapiServer);
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
  const endpoint = await services.locate({} as Request, '');
  const { result } = await testApi.test1(endpoint, { name: 'tester' });
  expect(result).toBe(`hello tester`);
});

test('multi-node adapter should register routes', async () => {
  const services = new CodeServices(new CodeNodeAdapter(server, log));
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

test('non-code-node could send request to code-node', async () => {
  const codeNode = new CodeServices(new CodeNodeAdapter(server, log));
  const codeNodeUrl = 'http://localhost:5601';
  const nonCodeNodeAdapter = new NonCodeNodeAdapter(codeNodeUrl, log);
  const nonCodeNode = new CodeServices(nonCodeNodeAdapter);
  // replace client request fn to hapi.inject
  nonCodeNodeAdapter.requestFn = async (
    baseUrl: string,
    path: string,
    payload: RequestPayload,
    originRequest: Request
  ) => {
    expect(baseUrl).toBe(codeNodeUrl);
    const response = await hapiServer.inject({
      method: 'POST',
      url: path,
      headers: originRequest.headers,
      payload,
    });
    expect(response.statusCode).toBe(200);
    return JSON.parse(response.payload);
  };
  codeNode.registerHandler(TestDefinition, testServiceHandler);
  nonCodeNode.registerHandler(TestDefinition, null);
  const testApi = nonCodeNode.serviceFor(TestDefinition);
  const fakeRequest = ({
    path: 'fakePath',
    headers: {
      fakeHeader: 'fakeHeaderValue',
    },
  } as unknown) as Request;
  const fakeResource = 'fakeResource';
  const endpoint = await nonCodeNode.locate(fakeRequest, fakeResource);
  const { result } = await testApi.test1(endpoint, { name: 'tester' });
  expect(result).toBe(`hello tester`);

  const context = await testApi.test2(endpoint, {});
  expect(context.resource).toBe(fakeResource);
  expect(context.path).toBe(fakeRequest.path);
});
