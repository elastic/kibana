/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { GET_ANALYTICS_STATUS_API_TAG } from '../../../../common/constants';
import {
  ANALYTICS_STATUS_INTERNAL_URL,
  buildGetAnalyticsStatusRoute,
} from './get_analytics_status';

const buildRoute = (
  overrides: {
    mode?: 'views' | 'indices';
    sync?: {
      lastRegenAt: Date | null;
      lastRegenError: string | null;
      regenInFlight: boolean;
    } | null;
  } = {}
) => {
  const { mode = 'views', sync = { lastRegenAt: new Date('2026-04-27T10:00:00Z'), lastRegenError: null, regenInFlight: false } } = overrides;
  return buildGetAnalyticsStatusRoute({
    getAnalyticsMode: () => mode,
    getViewSyncService: () =>
      sync === null
        ? null
        : ({
            getStatus: () => sync,
          } as never),
  });
};

const invokeHandler = async (route: ReturnType<typeof buildRoute>) => {
  const response = httpServerMock.createResponseFactory();
  await route.handler({
    response,
    request: httpServerMock.createKibanaRequest(),
    context: {} as never,
    logger: {} as never,
    kibanaVersion: '0',
  });
  return response;
};

describe('GET /internal/cases/_analytics/status', () => {
  it('is registered as an internal GET on the documented URL', () => {
    const route = buildRoute();
    expect(route.method).toBe('get');
    expect(route.path).toBe(ANALYTICS_STATUS_INTERNAL_URL);
    expect(route.routerOptions?.access).toBe('internal');
  });

  it('gates access via the read-tier API tag (bundled into both read and all cases privileges)', () => {
    const route = buildRoute();
    expect(route.security).toEqual({
      authz: { requiredPrivileges: [GET_ANALYTICS_STATUS_API_TAG] },
    });
  });

  it('returns mode=views, the 9 view names, and the live regen status when the views path is active', async () => {
    const route = buildRoute({ mode: 'views' });
    const response = await invokeHandler(route);
    expect(response.ok).toHaveBeenCalledTimes(1);
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.mode).toBe('views');
    expect(body.viewNames).toHaveLength(9);
    expect(body.viewNames).toEqual(
      expect.arrayContaining([
        'cases.case.securitysolution',
        'cases.case_activity.observability',
        'cases.case_lifecycle.cases',
      ])
    );
    expect(body.lastRegenAt).toBe('2026-04-27T10:00:00.000Z');
    expect(body.lastRegenError).toBeNull();
    expect(body.regenInFlight).toBe(false);
  });

  it('returns mode=indices and null sync fields when the legacy path is active (no view sync service)', async () => {
    const route = buildRoute({ mode: 'indices', sync: null });
    const response = await invokeHandler(route);
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.mode).toBe('indices');
    expect(body.lastRegenAt).toBeNull();
    expect(body.lastRegenError).toBeNull();
    expect(body.regenInFlight).toBe(false);
    // viewNames is always returned so a UI consumer can compose Discover
    // links regardless of which surface is active.
    expect(body.viewNames).toHaveLength(9);
  });

  it('surfaces a regen error and in-flight state when present, so operators can diagnose without reaching for logs', async () => {
    /*
     * FAILURE SCENARIO: a recent regenerate failed (e.g. cluster_block).
     * The status route is the operator's primary diagnostic surface; if
     * we swallowed the error, the only signal would be that views are
     * stale, which is harder to act on.
     */
    const route = buildRoute({
      mode: 'views',
      sync: {
        lastRegenAt: null,
        lastRegenError: 'cluster_block',
        regenInFlight: true,
      },
    });
    const response = await invokeHandler(route);
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.lastRegenError).toBe('cluster_block');
    expect(body.regenInFlight).toBe(true);
  });
});
