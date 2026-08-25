/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { runWithSpan } from '../../telemetry/traces';
import { wrapMiddlewares, type Middleware } from '.';
import type { EntityStoreRequestHandlerContext } from '../../types';

jest.mock('../../telemetry/traces', () => ({
  runWithSpan: jest.fn(),
}));

describe('wrapMiddlewares', () => {
  let mockContext: EntityStoreRequestHandlerContext;
  let mockReq: KibanaRequest<unknown, unknown, unknown>;
  let mockRes: KibanaResponseFactory;
  let mockIsEntityStoreV2Enabled: jest.Mock;

  beforeEach(() => {
    (runWithSpan as jest.Mock).mockImplementation(({ cb }) => cb());
    mockIsEntityStoreV2Enabled = jest.fn().mockResolvedValue(true);
    mockContext = {
      entityStore: Promise.resolve({
        namespace: 'default',
        logger: loggerMock.create(),
        featureFlags: {
          isEntityStoreV2Enabled: mockIsEntityStoreV2Enabled,
        },
      }),
    } as unknown as EntityStoreRequestHandlerContext;

    mockReq = {
      route: {
        method: 'get',
        path: '/internal/entity_store/status',
      },
    } as unknown as KibanaRequest<unknown, unknown, unknown>;
    mockRes = {
      customError: jest.fn(({ statusCode, body }) => ({
        status: statusCode,
        payload: body,
      })),
    } as unknown as KibanaResponseFactory;
  });

  it('should stop execution if middleware returns IKibanaResponse', async () => {
    const handler = jest.fn().mockResolvedValue({
      status: 200,
    } as unknown as IKibanaResponse);
    const middleware: Middleware = jest.fn().mockResolvedValue({
      status: 501,
      payload: {
        message: 'stop now',
      },
    });

    const actualHandler = wrapMiddlewares(handler, [middleware]);

    const result = await actualHandler(mockContext, mockReq, mockRes);

    expect(result).toBeDefined();
    expect(result.status).toBe(501);
    expect((result as { payload: { message: string } }).payload.message).toBe('stop now');

    expect(middleware).toHaveBeenCalledWith(mockContext, mockReq, mockRes);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should execute handler', async () => {
    const handler = jest.fn().mockResolvedValue({
      status: 200,
    } as unknown as IKibanaResponse);
    const middleware: Middleware = jest.fn().mockResolvedValue(undefined);

    const actualHandler = wrapMiddlewares(handler, [middleware]);

    const result = await actualHandler(mockContext, mockReq, mockRes);

    expect(result).toBeDefined();
    expect(result.status).toBe(200);
    expect(middleware).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should run registered middlewares before custom middleware and handler', async () => {
    const callOrder: string[] = [];
    (runWithSpan as jest.Mock).mockImplementation(async ({ cb }) => {
      callOrder.push('tracing');
      return cb();
    });
    mockIsEntityStoreV2Enabled.mockImplementation(async () => {
      callOrder.push('featureFlag');
      return true;
    });

    const middleware: Middleware = async () => {
      callOrder.push('customMiddleware');
      return undefined;
    };
    const handler = jest.fn(async () => {
      callOrder.push('handler');
      return { status: 200 } as IKibanaResponse;
    });

    await wrapMiddlewares(handler, [middleware])(mockContext, mockReq, mockRes);
    expect(callOrder).toEqual(['tracing', 'featureFlag', 'customMiddleware', 'handler']);
  });

  it('should pass route data to tracing wrapper', async () => {
    const handler = jest.fn().mockResolvedValue({
      status: 200,
    } as unknown as IKibanaResponse);

    await wrapMiddlewares(handler)(mockContext, mockReq, mockRes);

    expect(runWithSpan).toHaveBeenCalledWith({
      name: 'entityStore.api',
      namespace: 'default',
      attributes: {
        'entity_store.api.method': 'get',
        'entity_store.api.path': '/internal/entity_store/status',
      },
      cb: expect.any(Function),
    });
  });
});
