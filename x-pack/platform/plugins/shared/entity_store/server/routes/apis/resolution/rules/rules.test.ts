/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { API_VERSIONS, ENTITY_STORE_ROUTES, RESOLUTION_RULE_IDS } from '../../../../../common';
import { RESOLUTION_ENTITY_STORE_PERMISSIONS } from '../../../constants';
import type { EntityStorePluginRouter } from '../../../../types';
import { wrapMiddlewares } from '../../../middleware';
import { enterpriseLicenseMiddleware } from '../../../middleware/enterprise_license';
import { registerResolutionRulesList } from './list';
import { registerResolutionRulesEnable } from './enable';
import { registerResolutionRulesDisable } from './disable';

vi.mock('../../../middleware', () => {
      const mocked = {
      wrapMiddlewares: vi.fn((handler) => handler),
    };
      return { ...mocked, default: mocked };
    });

const mockedWrapMiddlewares = wrapMiddlewares as MockedFunction<typeof wrapMiddlewares>;

interface RegisteredRoute {
  routeConfig: Record<string, unknown>;
  versionConfig: Record<string, unknown>;
  handler: Function;
}

const createRouter = (
  method: 'get' | 'put'
): { router: EntityStorePluginRouter; route: RegisteredRoute } => {
  const route = {} as RegisteredRoute;
  const addVersion = vi.fn((versionConfig, handler) => {
    route.versionConfig = versionConfig;
    route.handler = handler;
  });
  const register = vi.fn((routeConfig) => {
    route.routeConfig = routeConfig;
    return { addVersion };
  });

  return {
    router: {
      versioned: {
        [method]: register,
      },
    } as unknown as EntityStorePluginRouter,
    route,
  };
};

const createResponse = () => ({
  ok: vi.fn((response) => response),
  customError: vi.fn((response) => response),
});

describe('resolution rules routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers and handles list with effective rule defaults', async () => {
    const { router, route } = createRouter('get');
    const rules = [
      {
        id: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH,
        kind: 'same_field',
        managed: true,
        enabled: true,
      },
    ];
    const ctx = {
      entityStore: Promise.resolve({
        entityResolutionRuleClient: { getEffectiveRules: vi.fn().mockResolvedValue(rules) },
      }),
    };
    const res = createResponse();

    registerResolutionRulesList(router);
    const result = await route.handler(ctx, {}, res);

    expect(route.routeConfig).toMatchObject({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_LIST,
      access: 'public',
      security: { authz: RESOLUTION_ENTITY_STORE_PERMISSIONS },
      enableQueryVersion: true,
    });
    expect(route.versionConfig).toMatchObject({
      version: API_VERSIONS.public.v1,
      validate: false,
    });
    expect(mockedWrapMiddlewares).toHaveBeenCalledWith(expect.any(Function), [
      enterpriseLicenseMiddleware,
    ]);
    expect(res.ok).toHaveBeenCalledWith({ body: { rules } });
    expect(result).toEqual({ body: { rules } });
  });

  it('registers and handles enable as an upsert', async () => {
    const { router, route } = createRouter('put');
    const rule = {
      id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
      kind: 'related_user_alias_resolution',
      managed: true,
      enabled: true,
    };
    const setEnabled = vi.fn().mockResolvedValue(rule);
    const ctx = {
      entityStore: Promise.resolve({
        logger: { error: vi.fn() },
        entityResolutionRuleClient: { setEnabled },
      }),
    };
    const res = createResponse();

    registerResolutionRulesEnable(router);
    await route.handler(
      ctx,
      { params: { id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION } },
      res
    );

    expect(route.routeConfig).toMatchObject({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_ENABLE,
      access: 'public',
      security: { authz: RESOLUTION_ENTITY_STORE_PERMISSIONS },
    });
    expect(route.versionConfig).toMatchObject({ version: API_VERSIONS.public.v1 });
    expect(setEnabled).toHaveBeenCalledWith(
      RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
      true
    );
    expect(res.ok).toHaveBeenCalledWith({ body: rule });
  });

  it('registers and handles disable for email_exact_match', async () => {
    const { router, route } = createRouter('put');
    const rule = {
      id: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH,
      kind: 'same_field',
      managed: true,
      enabled: false,
    };
    const setEnabled = vi.fn().mockResolvedValue(rule);
    const ctx = {
      entityStore: Promise.resolve({
        logger: { error: vi.fn() },
        entityResolutionRuleClient: { setEnabled },
      }),
    };
    const res = createResponse();

    registerResolutionRulesDisable(router);
    await route.handler(ctx, { params: { id: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH } }, res);

    expect(route.routeConfig).toMatchObject({
      path: ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_DISABLE,
      access: 'public',
      security: { authz: RESOLUTION_ENTITY_STORE_PERMISSIONS },
    });
    expect(setEnabled).toHaveBeenCalledWith(RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH, false);
    expect(res.ok).toHaveBeenCalledWith({ body: rule });
  });

  it('returns 404 for unknown rule ids', async () => {
    const { router, route } = createRouter('put');
    const error = SavedObjectsErrorHelpers.createGenericNotFoundError('Unknown resolution rule');
    const ctx = {
      entityStore: Promise.resolve({
        logger: { error: vi.fn() },
        entityResolutionRuleClient: { setEnabled: vi.fn().mockRejectedValue(error) },
      }),
    };
    const res = createResponse();

    registerResolutionRulesEnable(router);
    await route.handler(ctx, { params: { id: 'unknown' } }, res);

    expect(res.customError).toHaveBeenCalledWith({ statusCode: 404, body: error });
  });
});
