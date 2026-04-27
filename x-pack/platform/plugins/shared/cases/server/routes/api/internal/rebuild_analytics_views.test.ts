/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { REBUILD_ANALYTICS_VIEWS_API_TAG } from '../../../../common/constants';
import {
  REBUILD_ANALYTICS_VIEWS_INTERNAL_URL,
  buildRebuildAnalyticsViewsRoute,
} from './rebuild_analytics_views';

const buildRoute = (
  overrides: {
    syncService?: {
      regenerateNow: jest.Mock;
      getStatus: jest.Mock;
    } | null;
  } = {}
) => {
  const {
    syncService = {
      regenerateNow: jest.fn(async () => undefined),
      getStatus: jest.fn(() => ({
        lastRegenAt: new Date('2026-04-27T12:00:00Z'),
        lastRegenError: null,
        regenInFlight: false,
      })),
    },
  } = overrides;
  return {
    route: buildRebuildAnalyticsViewsRoute({
      getViewSyncService: () => (syncService === null ? null : (syncService as never)),
    }),
    syncService,
  };
};

const invoke = async (route: ReturnType<typeof buildRoute>['route']) => {
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

describe('POST /internal/cases/_analytics/views/_rebuild', () => {
  it('is registered as an internal POST on the documented URL', () => {
    const { route } = buildRoute();
    expect(route.method).toBe('post');
    expect(route.path).toBe(REBUILD_ANALYTICS_VIEWS_INTERNAL_URL);
    expect(route.routerOptions?.access).toBe('internal');
  });

  it('gates access via the all-tier API tag (only cases all privilege)', () => {
    const { route } = buildRoute();
    expect(route.security).toEqual({
      authz: { requiredPrivileges: [REBUILD_ANALYTICS_VIEWS_API_TAG] },
    });
  });

  it('forces a regeneration and returns rebuilt=true with the new status', async () => {
    const { route, syncService } = buildRoute();
    const response = await invoke(route);
    expect(syncService!.regenerateNow).toHaveBeenCalledTimes(1);
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body).toEqual({
      rebuilt: true,
      lastRegenAt: '2026-04-27T12:00:00.000Z',
      lastRegenError: null,
    });
  });

  it('returns rebuilt=false (200, not error) when the views path is not active', async () => {
    /*
     * FAILURE SCENARIO: an operator hits this route on a cluster where
     * views aren't supported (or are off via config). We surface a
     * clear "nothing to rebuild" rather than 500 — UI can show a
     * neutral state.
     */
    const { route } = buildRoute({ syncService: null });
    const response = await invoke(route);
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body).toEqual({
      rebuilt: false,
      lastRegenAt: null,
      lastRegenError: null,
    });
  });

  it('reports rebuilt=false when the regenerate completed but ES rejected the PUT calls', async () => {
    /*
     * FAILURE SCENARIO: ES is unhealthy. The sync service catches the
     * error internally (fire-and-forget contract for the templates
     * write path), so regenerateNow resolves without throwing — but
     * lastRegenError is populated. The route surfaces that signal so
     * an operator triggering rebuild can see why it didn't take.
     */
    const { route, syncService } = buildRoute({
      syncService: {
        regenerateNow: jest.fn(async () => undefined),
        getStatus: jest.fn(() => ({
          lastRegenAt: null,
          lastRegenError: 'cluster_block',
          regenInFlight: false,
        })),
      },
    });
    const response = await invoke(route);
    const body = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(body).toEqual({
      rebuilt: false,
      lastRegenAt: null,
      lastRegenError: 'cluster_block',
    });
    expect(syncService!.regenerateNow).toHaveBeenCalledTimes(1);
  });
});
