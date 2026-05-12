/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaResponseFactory, RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import { BaseAlertingRoute } from './base_alerting_route';
import { createRouteDependencies } from './test_utils';

class TestRoute extends BaseAlertingRoute {
  static routeOptions: RouteConfigOptions<RouteMethod> = {};

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
  let route: TestRoute;

  beforeEach(() => {
    const deps = createRouteDependencies();
    response = deps.response;
    route = new TestRoute(deps.ctx);
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

  describe('static options merging', () => {
    afterEach(() => {
      TestRoute.routeOptions = {};
    });

    it('returns default options when no routeOptions are declared', () => {
      expect(TestRoute.options).toEqual({
        access: 'public',
        tags: ['oas-tag:alerting-v2'],
        availability: { stability: 'experimental' },
      });
    });

    it('merges routeOptions with defaults', () => {
      TestRoute.routeOptions = { summary: 'Get a rule' };

      expect(TestRoute.options).toEqual({
        access: 'public',
        tags: ['oas-tag:alerting-v2'],
        availability: { stability: 'experimental' },
        summary: 'Get a rule',
      });
    });

    it('overrides defaults with child values', () => {
      TestRoute.routeOptions = { access: 'internal' };

      expect(TestRoute.options).toEqual({
        access: 'internal',
        tags: ['oas-tag:alerting-v2'],
        availability: { stability: 'experimental' },
      });
    });

    it('concatenates arrays from parent and child', () => {
      TestRoute.routeOptions = { tags: ['extra-tag'] };

      expect(TestRoute.options).toEqual({
        access: 'public',
        tags: ['oas-tag:alerting-v2', 'extra-tag'],
        availability: { stability: 'experimental' },
      });
    });

    it('deep merges nested objects', () => {
      TestRoute.routeOptions = { availability: { since: '1.0' } };

      expect(TestRoute.options).toEqual({
        access: 'public',
        tags: ['oas-tag:alerting-v2'],
        availability: { stability: 'experimental', since: '1.0' },
      });
    });
  });
});
