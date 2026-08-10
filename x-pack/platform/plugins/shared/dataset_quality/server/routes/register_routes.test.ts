/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import type {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import * as t from 'io-ts';
import { registerRoutes } from './register_routes';

type WrappedHandler = RequestHandler<unknown, unknown, unknown, RequestHandlerContext>;

const buildRouteHandler = (handler: jest.Mock) => {
  const repository = {
    'GET /internal/dataset_quality/__test': {
      endpoint: 'GET /internal/dataset_quality/__test' as const,
      params: t.type({}),
      options: {},
      security: { authz: { enabled: false, reason: 'test' } },
      handler,
    },
  };

  const coreSetup = coreMock.createSetup();
  const logger = loggerMock.create();

  registerRoutes({
    core: coreSetup,
    repository: repository as unknown as Parameters<typeof registerRoutes>[0]['repository'],
    logger,
    plugins: {} as Parameters<typeof registerRoutes>[0]['plugins'],
    getEsCapabilities: jest.fn(),
    getIsSecurityEnabled: jest.fn(),
  });

  const createRouterMock = coreSetup.http.createRouter as jest.Mock;
  expect(createRouterMock).toHaveBeenCalledTimes(1);
  const router = createRouterMock.mock.results[0].value as { get: jest.Mock };
  expect(router.get).toHaveBeenCalledTimes(1);
  const [, wrappedHandler] = router.get.mock.calls[0] as [unknown, WrappedHandler];

  return { wrappedHandler, logger };
};

const invoke = async (wrappedHandler: WrappedHandler) => {
  const request = httpServerMock.createKibanaRequest() as unknown as KibanaRequest;
  const response =
    httpServerMock.createResponseFactory() as unknown as jest.Mocked<KibanaResponseFactory>;
  const context = {} as unknown as RequestHandlerContext;
  await wrappedHandler(context, request, response);
  return response;
};

describe('registerRoutes error handling', () => {
  it('returns the upstream status and logs at debug for an ES ResponseError 4xx', async () => {
    const handler = jest.fn().mockRejectedValue(
      new errors.ResponseError({
        statusCode: 431,
        body: '<html><body><h1>431 Request Header Fields Too Large</h1></body></html>',
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    const { wrappedHandler, logger } = buildRouteHandler(handler);
    const response = await invoke(wrappedHandler);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 431,
      body: { message: 'Elasticsearch responded with status 431' },
    });
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    // The HTML body must not be propagated to the client.
    const customErrorArg = (response.customError as jest.Mock).mock.calls[0][0];
    expect(customErrorArg.body.message).not.toMatch(/<html>/);
  });

  it('uses the structured ES reason when the body is parsed JSON', async () => {
    const handler = jest.fn().mockRejectedValue(
      new errors.ResponseError({
        statusCode: 400,
        body: {
          error: { type: 'illegal_argument_exception', reason: 'field [foo] is missing' },
        },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    const { wrappedHandler, logger } = buildRouteHandler(handler);
    const response = await invoke(wrappedHandler);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: { message: 'field [foo] is missing' },
    });
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs at error for an ES ResponseError 5xx and forwards the original Error so stack/type survive', async () => {
    const cause = new errors.ResponseError({
      statusCode: 503,
      body: { error: { type: 'no_shard_available_action_exception', reason: 'no shards' } },
      headers: {},
      warnings: [],
      meta: {} as never,
    });
    const handler = jest.fn().mockRejectedValue(cause);

    const { wrappedHandler, logger } = buildRouteHandler(handler);
    const response = await invoke(wrappedHandler);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: { message: 'no shards' },
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.debug).not.toHaveBeenCalled();
    // Error instance survives so BaseLogger emits ECS error.stack_trace / error.type.
    const [firstArg] = (logger.error as jest.Mock).mock.calls[0];
    expect(firstArg).toBe(cause);
  });

  it('logs HTTP 429 (rate limit) at warn so capacity signals stay visible', async () => {
    const handler = jest.fn().mockRejectedValue(
      new errors.ResponseError({
        statusCode: 429,
        body: {
          error: { type: 'circuit_breaking_exception', reason: 'data too large' },
        },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    const { wrappedHandler, logger } = buildRouteHandler(handler);
    const response = await invoke(wrappedHandler);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 429,
      body: { message: 'data too large' },
    });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.debug).not.toHaveBeenCalled();
  });

  it('falls back to caused_by.reason when the top-level reason is missing', async () => {
    const handler = jest.fn().mockRejectedValue(
      new errors.ResponseError({
        statusCode: 400,
        body: {
          error: {
            type: 'mapper_parsing_exception',
            caused_by: {
              type: 'illegal_argument_exception',
              reason: 'mapper [foo] cannot be changed from type [keyword] to [text]',
            },
          },
        },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    const { wrappedHandler } = buildRouteHandler(handler);
    const response = await invoke(wrappedHandler);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: {
        message: 'mapper [foo] cannot be changed from type [keyword] to [text]',
      },
    });
  });

  it('falls back to root_cause[0].reason when both top-level reason and caused_by are missing', async () => {
    const handler = jest.fn().mockRejectedValue(
      new errors.ResponseError({
        statusCode: 400,
        body: {
          error: {
            type: 'search_phase_execution_exception',
            root_cause: [
              { type: 'illegal_argument_exception', reason: 'field [bar] is not aggregatable' },
            ],
          },
        },
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    const { wrappedHandler } = buildRouteHandler(handler);
    const response = await invoke(wrappedHandler);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: { message: 'field [bar] is not aggregatable' },
    });
  });

  it('returns 499 with a generic message for RequestAbortedError', async () => {
    const handler = jest.fn().mockRejectedValue(new errors.RequestAbortedError('aborted'));

    const { wrappedHandler, logger } = buildRouteHandler(handler);
    const response = await invoke(wrappedHandler);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 499,
      body: { message: 'Client closed request' },
    });
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('returns 500 and logs at error for a generic Error', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('boom'));

    const { wrappedHandler, logger } = buildRouteHandler(handler);
    const response = await invoke(wrappedHandler);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'boom' },
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('uses Boom statusCode for Boom errors and logs by severity', async () => {
    const handler = jest.fn().mockRejectedValue(Boom.badRequest('bad input'));

    const { wrappedHandler, logger } = buildRouteHandler(handler);
    const response = await invoke(wrappedHandler);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: { message: 'bad input' },
    });
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
