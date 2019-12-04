/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockAddDefaultField } from './query_default_field.test.mocks';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

import { registerQueryDefaultFieldRoutes } from './query_default_field';
import { MockRouter, createMockRouter } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { kibanaResponseFactory } from 'src/core/server';

const callWithRequest = jest.fn();

describe('add query default field API', () => {
  let serverShim: any;
  let mockRouter: MockRouter;
  let ctxMock: any;

  beforeEach(() => {
    ctxMock = {};
    mockRouter = createMockRouter();
    serverShim = {
      router: mockRouter,
      plugins: {
        xpack_main: {
          info: jest.fn(),
        },
        apm_oss: {
          indexPatterns: ['apm-*'],
        },
        elasticsearch: {
          getCluster: () => ({ callWithRequest } as any),
        } as any,
      },
    };
    mockAddDefaultField.mockClear();
    registerQueryDefaultFieldRoutes(serverShim);
  });

  it('calls addDefaultField with index, field types, and other fields', async () => {
    mockAddDefaultField.mockResolvedValueOnce({ acknowledged: true });
    const resp = await serverShim.router.getHandler({
      method: 'post',
      pathPattern: '/api/upgrade_assistant/add_query_default_field/{indexName}',
    })(
      ctxMock,
      createRequestMock({
        params: { indexName: 'myIndex' },
        body: {
          fieldTypes: ['text', 'boolean'],
          otherFields: ['myCustomField'],
        },
      }),
      kibanaResponseFactory
    );

    expect(mockAddDefaultField).toHaveBeenCalledWith(
      callWithRequest,
      expect.anything(),
      'myIndex',
      new Set(['text', 'boolean']),
      new Set(['myCustomField'])
    );
    expect(resp.status).toEqual(200);
    expect(resp.payload).toEqual({ acknowledged: true });
  });

  it('calls addDefaultField with index, field types if other fields is not specified', async () => {
    mockAddDefaultField.mockResolvedValueOnce({ acknowledged: true });
    const resp = await serverShim.router.getHandler({
      method: 'post',
      pathPattern: '/api/upgrade_assistant/add_query_default_field/{indexName}',
    })(
      ctxMock,
      createRequestMock({
        params: { indexName: 'myIndex' },
        body: {
          fieldTypes: ['text', 'boolean'],
        },
      }),
      kibanaResponseFactory
    );

    expect(mockAddDefaultField).toHaveBeenCalledWith(
      callWithRequest,
      expect.anything(),
      'myIndex',
      new Set(['text', 'boolean']),
      undefined
    );
    expect(resp.status).toEqual(200);
    expect(resp.payload).toEqual({ acknowledged: true });
  });
});
