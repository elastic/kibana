/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaResponseFactory, RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod/v4';
import { BaseAlertingRoute, type AlertingRouteSchemas } from './base_alerting_route';
import { createRouteDependencies } from './test_utils';

class TestRoute extends BaseAlertingRoute {
  static routeOptions: RouteConfigOptions<RouteMethod> = {};
  // Widened from `protected static` so tests can swap in route-specific
  // declarations and assert how `static get validate()` merges them with
  // the base `commonResponses`.
  public static schemas: AlertingRouteSchemas = {};

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
    const deps = createRouteDependencies();
    response = deps.response;
    logger = deps.logger;
    route = new TestRoute(deps.ctx);
  });

  it('delegates to execute() and returns the result', async () => {
    const expectedResponse = response.ok({ body: { id: '123' } });
    route.executeFn.mockResolvedValue(expectedResponse);

    const result = await route.handle();

    expect(result).toBe(expectedResponse);
    expect(route.executeFn).toHaveBeenCalledTimes(1);
  });

  describe('onError - standard error response shape', () => {
    it('returns { code, error, message } for plain Boom errors (no data attached)', async () => {
      route.executeFn.mockRejectedValue(Boom.notFound('rule not found'));

      await route.handle();

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 404,
        body: {
          code: 'NOT_FOUND',
          error: 'Not Found',
          message: 'rule not found',
        },
      });
    });

    it('uses the domain-specific code from boom.data when provided', async () => {
      route.executeFn.mockRejectedValue(
        Boom.notFound('Rule "abc" not found.', { code: 'RULE_NOT_FOUND' })
      );

      await route.handle();

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 404,
        body: {
          code: 'RULE_NOT_FOUND',
          error: 'Not Found',
          message: 'Rule "abc" not found.',
        },
      });
    });

    it('includes structured details from boom.data when provided', async () => {
      route.executeFn.mockRejectedValue(
        Boom.notFound('Rule "abc" not found.', {
          code: 'RULE_NOT_FOUND',
          details: { rule_id: 'abc' },
        })
      );

      await route.handle();

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 404,
        body: {
          code: 'RULE_NOT_FOUND',
          error: 'Not Found',
          message: 'Rule "abc" not found.',
          details: { rule_id: 'abc' },
        },
      });
    });

    it('omits details when boom.data does not include them', async () => {
      route.executeFn.mockRejectedValue(
        Boom.badRequest('Invalid input', { code: 'INVALID_INPUT' })
      );

      await route.handle();

      const call = response.customError.mock.calls[0][0];
      expect(call.body).not.toHaveProperty('details');
    });

    it('boomifies non-Boom errors to 500 with a derived code', async () => {
      route.executeFn.mockRejectedValue(new TypeError('cannot read property'));

      await route.handle();

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          code: 'INTERNAL_SERVER_ERROR',
          error: 'Internal Server Error',
          message: 'An internal server error occurred',
        },
      });
    });

    it('logs 5xx errors at error level with the original error attached', async () => {
      const cause = new TypeError('boom');
      route.executeFn.mockRejectedValue(cause);

      await route.handle();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('test route error'), {
        error: cause,
      });
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('logs 4xx errors at debug level only', async () => {
      route.executeFn.mockRejectedValue(Boom.notFound('rule not found'));

      await route.handle();

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('test route error'));
      expect(logger.error).not.toHaveBeenCalled();
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

  describe('static validate - common error responses', () => {
    afterEach(() => {
      TestRoute.schemas = {};
    });

    it('emits the shared 401/403/500 responses even when the subclass declares no schemas', () => {
      const validate = TestRoute.validate;

      if (validate === false) {
        throw new Error('expected validate to be an object when commonResponses are merged');
      }

      expect(
        Object.keys(validate.response ?? {})
          .map(Number)
          .sort()
      ).toEqual([401, 403, 500]);
      expect(validate.response?.[401]?.description).toBe(
        'Indicates the request was not authenticated.'
      );
      expect(validate.response?.[403]?.description).toBe(
        'Indicates the user does not have the required privileges to perform the request.'
      );
      expect(validate.response?.[500]?.description).toBe(
        'Indicates an unexpected server-side error.'
      );
      // Each common response references the shared errorResponseSchema.
      expect(typeof validate.response?.[401]?.body).toBe('function');
      expect(typeof validate.response?.[403]?.body).toBe('function');
      expect(typeof validate.response?.[500]?.body).toBe('function');
    });

    it('merges the subclass response schemas with the common ones', () => {
      const okSchemaFactory = jest.fn(() => z.object({ id: z.string() }));

      TestRoute.schemas = {
        response: {
          200: {
            body: okSchemaFactory,
            description: 'Indicates a successful call.',
          },
        },
      };

      const validate = TestRoute.validate;

      if (validate === false) {
        throw new Error('expected validate to be an object');
      }

      expect(
        Object.keys(validate.response ?? {})
          .map(Number)
          .sort()
      ).toEqual([200, 401, 403, 500]);
      expect(validate.response?.[200]?.body).toBe(okSchemaFactory);
    });

    it('lets the subclass override a common status code (e.g. a specialized 500 description)', () => {
      TestRoute.schemas = {
        response: {
          500: {
            description: 'Specialized 500 description for this route.',
          },
        },
      };

      const validate = TestRoute.validate;

      if (validate === false) {
        throw new Error('expected validate to be an object');
      }

      expect(validate.response?.[500]?.description).toBe(
        'Specialized 500 description for this route.'
      );
      // 401 / 403 stay on their common descriptions.
      expect(validate.response?.[401]?.description).toBe(
        'Indicates the request was not authenticated.'
      );
      expect(validate.response?.[403]?.description).toBe(
        'Indicates the user does not have the required privileges to perform the request.'
      );
    });

    it('still wraps subclass request schemas with buildRouteValidationWithZod', () => {
      TestRoute.schemas = {
        request: {
          params: z.object({ id: z.string() }),
        },
      };

      const validate = TestRoute.validate;

      if (validate === false) {
        throw new Error('expected validate to be an object');
      }

      expect(typeof validate.request?.params).toBe('function');
      // Common responses are still merged in alongside the request schemas.
      expect(
        Object.keys(validate.response ?? {})
          .map(Number)
          .sort()
      ).toEqual([401, 403, 500]);
    });
  });
});
