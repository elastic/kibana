/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AlertingRouteContext } from './alerting_route_context';
import { BaseAlertingRoute } from './base_alerting_route';

const createMockContext = (
  response: KibanaResponseFactory,
  logger: Logger
): AlertingRouteContext => ({ response, logger });

class TestRoute extends BaseAlertingRoute {
  protected readonly routeName = 'test route';
  public executeFn = jest.fn();
  public onErrorSpy = jest.fn();

  protected async execute() {
    return this.executeFn();
  }

  protected onError(e: Boom.Boom | Error) {
    const result = this.onErrorSpy(e);

    if (result) {
      return result;
    }

    return super.onError(e);
  }
}

describe('BaseAlertingRoute', () => {
  let response: jest.Mocked<KibanaResponseFactory>;
  let logger: jest.Mocked<Logger>;
  let route: TestRoute;

  beforeEach(() => {
    response = httpServerMock.createResponseFactory();
    logger = loggingSystemMock.createLogger();
    route = new TestRoute(createMockContext(response, logger));
  });

  it('delegates to execute() and returns the result', async () => {
    const expectedResponse = response.ok({ body: { id: '123' } });
    route.executeFn.mockResolvedValue(expectedResponse);

    const result = await route.handle();

    expect(result).toBe(expectedResponse);
    expect(route.executeFn).toHaveBeenCalledTimes(1);
  });

  it('preserves Boom error status codes', async () => {
    route.executeFn.mockRejectedValue(Boom.notFound('rule not found'));

    await route.handle();

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 404,
      body: expect.objectContaining({ error: 'Not Found', message: 'rule not found' }),
    });
  });

  it('converts non-Boom errors to 500', async () => {
    route.executeFn.mockRejectedValue(new TypeError('cannot read property'));

    await route.handle();

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
      }),
    });
  });
});
