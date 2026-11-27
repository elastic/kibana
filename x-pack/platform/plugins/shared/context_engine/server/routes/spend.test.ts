/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerSpendRoutes } from './spend';
import { AI_INDEX_SPEND_PATH, SPACE_SPEND_PATH } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { SpendServiceApi } from '../spend';
import type { SpaceSpendResponse, SpendTotals } from '../../common/spend';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
}

const emptySpend: SpendTotals = {
  cost_usd: 0,
  unpriced_tokens: 0,
  tokens: { input_tokens: 0, output_tokens: 0, cached_tokens: 0 },
};

describe('spend routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let spendService: jest.Mocked<SpendServiceApi>;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const getRoute = (path: string): RegisteredRoute => {
    const route = routes[path];
    expect(route).toBeDefined();
    return route;
  };

  const callRoute = async (path: string, request: Record<string, unknown>) =>
    getRoute(path).handler(createContext(), httpServerMock.createKibanaRequest(request), response);

  beforeEach(() => {
    routes = {};
    featureFlagEnabled = true;
    response = httpServerMock.createResponseFactory();
    spendService = {
      getSpaceSpend: jest.fn(),
      getAiIndexSpend: jest.fn(),
    };

    const router = {
      versioned: {
        get: jest.fn((config: RegisteredRoute['config']) => ({
          addVersion: (_versionConfig: unknown, handler: RequestHandler) => {
            routes[config.path] = { config, handler };
            return { addVersion: jest.fn() };
          },
        })),
      },
    } as unknown as IRouter;

    registerSpendRoutes({
      router,
      logger: loggingSystemMock.createLogger(),
      getSpendService: () => spendService,
      getSpaces: async () => undefined,
    });
  });

  it('registers internal read-only routes', () => {
    for (const path of [SPACE_SPEND_PATH, AI_INDEX_SPEND_PATH]) {
      expect(getRoute(path).config).toMatchObject({
        access: 'internal',
        security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
      });
    }
  });

  it('404s while Context Engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute(SPACE_SPEND_PATH, {});

    expect(response.notFound).toHaveBeenCalled();
    expect(spendService.getSpaceSpend).not.toHaveBeenCalled();
  });

  it('returns the spend of the default space', async () => {
    const spend: SpaceSpendResponse = {
      period: { start: '2026-10-01T00:00:00.000Z', end: '2026-11-01T00:00:00.000Z' },
      pricing: { source: 'unavailable' },
      space: emptySpend,
      ai_indices: [],
    };
    spendService.getSpaceSpend.mockResolvedValue(spend);

    await callRoute(SPACE_SPEND_PATH, {});

    expect(spendService.getSpaceSpend).toHaveBeenCalledWith('default');
    expect(response.ok).toHaveBeenCalledWith({ body: spend });
  });

  it('maps a missing AI index to 404', async () => {
    spendService.getAiIndexSpend.mockRejectedValue(new AiIndexNotFoundError('missing'));

    await callRoute(AI_INDEX_SPEND_PATH, { params: { aiIndexId: 'missing' } });

    expect(response.notFound).toHaveBeenCalled();
  });

  it('maps an unexpected failure to 500', async () => {
    spendService.getAiIndexSpend.mockRejectedValue(new Error('boom'));

    await callRoute(AI_INDEX_SPEND_PATH, { params: { aiIndexId: 'tickets' } });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});
