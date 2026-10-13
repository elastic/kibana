/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerBudgetRoutes } from './budgets';
import { AI_INDEX_BUDGET_PATH, SPACE_BUDGETS_PATH } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { BudgetServiceApi } from '../budgets';
import type { SpaceBudgetStatusResponse } from '../../common/budgets';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
  validate: false | { request: { body?: { validate: (value: unknown) => unknown } } };
}

describe('budget routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let auditLog: jest.Mock;
  let budgetService: jest.Mocked<BudgetServiceApi>;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        security: { audit: { logger: { log: auditLog } } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const getRoute = (method: string, path: string): RegisteredRoute => {
    const route = routes[`${method}:${path}`];
    expect(route).toBeDefined();
    return route;
  };

  const callRoute = async (method: string, path: string, request: Record<string, unknown>) =>
    getRoute(method, path).handler(
      createContext(),
      httpServerMock.createKibanaRequest(request),
      response
    );

  beforeEach(() => {
    routes = {};
    featureFlagEnabled = true;
    auditLog = jest.fn();
    response = httpServerMock.createResponseFactory();
    budgetService = {
      getSpaceStatus: jest.fn(),
      getAiIndexStatus: jest.fn(),
      checkAdmission: jest.fn(),
      setAiIndexBudget: jest.fn(),
    };

    const createVersionedRoute = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (
        versionConfig: { validate: RegisteredRoute['validate'] },
        handler: RequestHandler
      ) => {
        routes[`${method}:${config.path}`] = { config, handler, validate: versionConfig.validate };
        return { addVersion: jest.fn() };
      },
    });

    const router = {
      versioned: {
        get: jest.fn(createVersionedRoute('GET')),
        put: jest.fn(createVersionedRoute('PUT')),
      },
    } as unknown as IRouter;

    registerBudgetRoutes({
      router,
      logger: loggingSystemMock.createLogger(),
      getBudgetService: () => budgetService,
      getSpaces: async () => undefined,
    });
  });

  it('registers internal routes, with the write privilege only on the update', () => {
    expect(getRoute('GET', SPACE_BUDGETS_PATH).config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(getRoute('GET', AI_INDEX_BUDGET_PATH).config.security.authz.requiredPrivileges).toEqual([
      apiPrivileges.readContextEngine,
    ]);
    expect(getRoute('PUT', AI_INDEX_BUDGET_PATH).config.security.authz.requiredPrivileges).toEqual([
      apiPrivileges.writeContextEngine,
    ]);
  });

  it('404s while Context Engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute('GET', SPACE_BUDGETS_PATH, {});

    expect(response.notFound).toHaveBeenCalled();
    expect(budgetService.getSpaceStatus).not.toHaveBeenCalled();
  });

  it('returns the space status of the default space', async () => {
    const spend = {
      cost_usd: 0,
      unpriced_tokens: 0,
      tokens: { input_tokens: 0, output_tokens: 0, cached_tokens: 0 },
    };
    const status: SpaceBudgetStatusResponse = {
      period: { start: '2026-10-01T00:00:00.000Z', end: '2026-11-01T00:00:00.000Z' },
      pricing: { source: 'unavailable' },
      space: {
        automations: { spend, state: 'unlimited' },
        suggestions: { spend, state: 'unlimited' },
      },
      ai_indices: [],
    };
    budgetService.getSpaceStatus.mockResolvedValue(status);

    await callRoute('GET', SPACE_BUDGETS_PATH, {});

    expect(budgetService.getSpaceStatus).toHaveBeenCalledWith('default');
    expect(response.ok).toHaveBeenCalledWith({ body: status });
  });

  it('maps a missing AI index to 404', async () => {
    budgetService.getAiIndexStatus.mockRejectedValue(new AiIndexNotFoundError('missing'));

    await callRoute('GET', AI_INDEX_BUDGET_PATH, { params: { aiIndexId: 'missing' } });

    expect(response.notFound).toHaveBeenCalled();
  });

  it('stores only the configured limits and audits the update', async () => {
    budgetService.setAiIndexBudget.mockImplementation(async (_space, _id, budget) => budget);

    await callRoute('PUT', AI_INDEX_BUDGET_PATH, {
      params: { aiIndexId: 'tickets' },
      body: { automations_monthly_usd: 20, suggestions_monthly_usd: undefined, cost_tier: 'cheap' },
    });

    expect(budgetService.setAiIndexBudget).toHaveBeenCalledWith('default', 'tickets', {
      automations_monthly_usd: 20,
      cost_tier: 'cheap',
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: { budget: { automations_monthly_usd: 20, cost_tier: 'cheap' } },
    });
    expect(auditLog).toHaveBeenCalledTimes(1);
  });

  it('bounds the limits and the cost tier in the request body', () => {
    const { validate } = getRoute('PUT', AI_INDEX_BUDGET_PATH);
    const bodySchema = validate !== false ? validate.request.body : undefined;

    expect(() => bodySchema?.validate({ automations_monthly_usd: -1 })).toThrow();
    expect(() => bodySchema?.validate({ automations_monthly_usd: 2_000_000 })).toThrow();
    expect(() => bodySchema?.validate({ cost_tier: 'luxury' })).toThrow();
    expect(bodySchema?.validate({ suggestions_monthly_usd: 5 })).toEqual({
      suggestions_monthly_usd: 5,
    });
  });
});
