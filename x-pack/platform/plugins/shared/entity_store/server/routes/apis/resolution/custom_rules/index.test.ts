/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { NEVER, Subject, type Observable } from 'rxjs';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../../common';
import {
  RESOLUTION_ENTITY_STORE_MANAGE_PERMISSIONS,
  RESOLUTION_ENTITY_STORE_PERMISSIONS,
} from '../../../constants';
import type { EntityStorePluginRouter } from '../../../../types';
import { wrapMiddlewares } from '../../../middleware';
import { enterpriseLicenseMiddleware } from '../../../middleware/enterprise_license';
import {
  MissingEntityIndexPrivilegeError,
  CustomResolutionRuleNotFoundError,
  EntityStoreNotInstalledError,
  InvalidCustomResolutionRuleError,
} from '../../../../domain/errors';
import { registerCustomResolutionRulesRoutes } from '.';

jest.mock('../../../middleware', () => ({
  wrapMiddlewares: jest.fn((handler) => handler),
}));

const mockedWrapMiddlewares = wrapMiddlewares as jest.MockedFunction<typeof wrapMiddlewares>;

interface RegisteredRoute {
  method: string;
  routeConfig: Record<string, unknown>;
  versionConfig: Record<string, unknown>;
  handler: (
    ctx: unknown,
    req: unknown,
    res: unknown
  ) => Promise<{ status: number; body?: unknown }>;
}

const registerAll = (): RegisteredRoute[] => {
  const routes: RegisteredRoute[] = [];
  const register = (method: string) =>
    jest.fn((routeConfig) => {
      const route = { method, routeConfig } as RegisteredRoute;
      routes.push(route);
      return {
        addVersion: jest.fn((versionConfig, handler) => {
          route.versionConfig = versionConfig;
          route.handler = handler;
        }),
      };
    });
  const router = {
    versioned: {
      get: register('get'),
      post: register('post'),
      put: register('put'),
      delete: register('delete'),
    },
  } as unknown as EntityStorePluginRouter;
  registerCustomResolutionRulesRoutes(router);
  return routes;
};

const createResponse = () => ({
  ok: jest.fn((response) => ({ status: 200, ...response })),
  badRequest: jest.fn((response) => ({ status: 400, ...response })),
  notFound: jest.fn((response) => ({ status: 404, ...response })),
  forbidden: jest.fn((response) => ({ status: 403, ...response })),
  conflict: jest.fn((response) => ({ status: 409, ...response })),
  customError: jest.fn((response) => ({ status: response.statusCode, ...response })),
});

const request = (aborted$: Observable<void> = NEVER) => ({ body: {}, events: { aborted$ } });

const { RESOLUTION_CUSTOM_RULES, RESOLUTION_CUSTOM_RULE, RESOLUTION_CUSTOM_RULES_PREVIEW } =
  ENTITY_STORE_ROUTES.internal;

describe('custom resolution rules routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['get', RESOLUTION_CUSTOM_RULES, RESOLUTION_ENTITY_STORE_PERMISSIONS],
    ['post', RESOLUTION_CUSTOM_RULES, RESOLUTION_ENTITY_STORE_MANAGE_PERMISSIONS],
    ['post', RESOLUTION_CUSTOM_RULES_PREVIEW, RESOLUTION_ENTITY_STORE_PERMISSIONS],
    ['get', RESOLUTION_CUSTOM_RULE, RESOLUTION_ENTITY_STORE_PERMISSIONS],
    ['put', RESOLUTION_CUSTOM_RULE, RESOLUTION_ENTITY_STORE_MANAGE_PERMISSIONS],
    ['delete', RESOLUTION_CUSTOM_RULE, RESOLUTION_ENTITY_STORE_MANAGE_PERMISSIONS],
  ])('%s %s is internal, version 2, and needs the right privileges', (method, path, authz) => {
    const route = registerAll().find(
      (candidate) => candidate.method === method && candidate.routeConfig.path === path
    );

    expect(route?.routeConfig).toMatchObject({
      access: 'internal',
      security: { authz },
      enableQueryVersion: true,
    });
    expect(route?.versionConfig).toMatchObject({ version: API_VERSIONS.internal.v2 });
  });

  it('wraps every route with the Enterprise license middleware', () => {
    const routes = registerAll();

    expect(routes).toHaveLength(6);
    expect(mockedWrapMiddlewares).toHaveBeenCalledTimes(6);
    for (const [, middlewares] of mockedWrapMiddlewares.mock.calls) {
      expect(middlewares).toEqual([enterpriseLicenseMiddleware]);
    }
  });

  describe('error mapping', () => {
    const createRoute = () =>
      registerAll().find(
        ({ method, routeConfig }) =>
          method === 'post' && routeConfig.path === RESOLUTION_CUSTOM_RULES
      )!;

    const callWith = async (error: unknown) => {
      const logger = loggerMock.create();
      const res = createResponse();
      const ctx = {
        entityStore: Promise.resolve({
          logger,
          customResolutionRulesClient: { create: jest.fn().mockRejectedValue(error) },
        }),
      };
      const result = await createRoute().handler(ctx, request(), res);
      return { result, logger };
    };

    it.each([
      ['an invalid rule', 400, new InvalidCustomResolutionRuleError('bad')],
      ['a missing rule', 404, new CustomResolutionRuleNotFoundError('x')],
      ['a missing entity store', 404, new EntityStoreNotInstalledError()],
      [
        'no write access to the entity index',
        403,
        new MissingEntityIndexPrivilegeError('i', 'write'),
      ],
      [
        'a saved-objects authorization error',
        403,
        SavedObjectsErrorHelpers.decorateForbiddenError(new Error('x')),
      ],
      ['a version conflict', 409, SavedObjectsErrorHelpers.createConflictError('t', 'x')],
      [
        'an Elasticsearch authorization error',
        403,
        new esErrors.ResponseError({
          statusCode: 403,
          body: {
            error: {
              type: 'security_exception',
              reason: 'action [indices:data/read/esql] is unauthorized',
            },
          },
          headers: {},
          warnings: [],
          meta: {} as never,
        }),
      ],
    ])('maps %s to %i', async (_case, status, error) => {
      const { result } = await callWith(error);

      expect(result.status).toBe(status);
    });

    it('logs and rethrows anything else', async () => {
      const error = new Error('boom');
      const logger = loggerMock.create();
      const ctx = {
        entityStore: Promise.resolve({
          logger,
          customResolutionRulesClient: { create: jest.fn().mockRejectedValue(error) },
        }),
      };

      await expect(createRoute().handler(ctx, request(), createResponse())).rejects.toBe(error);
      expect(logger.error).toHaveBeenCalledWith(error);
    });

    it('passes the Elasticsearch reason through on a 403', async () => {
      const { result } = await callWith(
        new esErrors.ResponseError({
          statusCode: 403,
          body: { error: { type: 'security_exception', reason: 'missing view_index_metadata' } },
          headers: {},
          warnings: [],
          meta: {} as never,
        })
      );

      expect(result.body).toEqual({ message: 'missing view_index_metadata' });
    });

    it('does not log a preview the client closed as a server error', async () => {
      const aborted$ = new Subject<void>();
      const logger = loggerMock.create();
      const ctx = {
        entityStore: Promise.resolve({
          logger,
          customResolutionRulesClient: {
            preview: jest.fn().mockImplementation(async (_body, signal: AbortSignal) => {
              aborted$.next();
              expect(signal.aborted).toBe(true);
              throw new Error('Custom rule preview aborted');
            }),
          },
        }),
      };
      const previewRoute = registerAll().find(
        ({ method, routeConfig }) =>
          method === 'post' && routeConfig.path === RESOLUTION_CUSTOM_RULES_PREVIEW
      )!;

      const result = await previewRoute.handler(ctx, request(aborted$), createResponse());

      expect(result.status).toBe(499);
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
