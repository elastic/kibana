/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request, Server } from 'hapi';
import { createTestHapiServer } from '../test_utils';
import { DistributedCode } from './distributed_code';
import { LocalHandlerAdapter } from './local_handler_adapter';
import { CodeServerRouter } from '../security';
import { RequestContext, ServiceHandlerFor } from './service_definition';
import { CodeNodeAdapter, RequestPayload } from './multinode/code_node_adapter';
import { DEFAULT_SERVICE_OPTION } from './handler_adpter';
import { NonCodeNodeAdapter } from './multinode/non_code_node_adapter';

let hapiServer: Server = createTestHapiServer();
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
  const dcode = new DistributedCode(new LocalHandlerAdapter());
  dcode.registerHandler(TestDefinition, testServiceHandler);
  const testApi = dcode.serviceFor(TestDefinition);
  const endpoint = await dcode.locate({} as Request, '');
  const { result } = await testApi.test1(endpoint, { name: 'tester' });
  expect(result).toBe(`hello tester`);
});

test('multi-node adapter should register routes', async () => {
  const dcode = new DistributedCode(new CodeNodeAdapter(server));
  dcode.registerHandler(TestDefinition, testServiceHandler);
  const prefix = DEFAULT_SERVICE_OPTION.routePrefix;

  const path1 = `${prefix}/test1`;
  const response = await hapiServer.inject({
    method: 'POST',
    url: path1,
    payload: { params: { name: 'tester' } },
  });
  expect(response.statusCode).toBe(200);
  const { result } = JSON.parse(response.payload);
  expect(result).toBe(`hello tester`);
});

test('non-code-node could send request to code-node', async () => {
  const codeNode = new DistributedCode(new CodeNodeAdapter(server));
  const codeNodeUrl = 'http://localhost:5601';
  const nonCodeNodeAdapter = new NonCodeNodeAdapter(codeNodeUrl);
  const nonCodeNode = new DistributedCode(nonCodeNodeAdapter);
  // replace client request fn to hapi.inject
  nonCodeNodeAdapter.requestFn = async (baseUrl: string, path: string, payload: RequestPayload) => {
    expect(baseUrl).toBe(codeNodeUrl);
    const response = await hapiServer.inject({
      method: 'POST',
      url: path,
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
  expect(context.headers).toStrictEqual(fakeRequest.headers);
  expect(context.path).toBe(fakeRequest.path);
});
