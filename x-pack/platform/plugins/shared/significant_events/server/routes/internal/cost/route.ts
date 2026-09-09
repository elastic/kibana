/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CostResponse } from '../../../../common/cost';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { assertCanManageRunQuotas } from '../../../lib/run_quotas';
import {
  calculateSignificantEventsCost,
  createUnavailableCostResponse,
} from '../../../lib/cost/cost_service';
import { resolveTokenTrackingCoverage } from '../../../lib/cost/token_tracking_coverage';

const ROUTE_CACHE_TTL_MS = 60_000;

const optionalBooleanQuery = z.preprocess((value) => {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}, z.boolean().optional());

interface CostRouteCacheState {
  generation: number;
  lastSuccessfulRefreshGeneration: number;
  inFlight: Promise<CostResponse> | null;
  inFlightGeneration: number;
  entry: {
    response: CostResponse;
    expiresAtMs: number;
    generation: number;
  } | null;
}

const routeCache: CostRouteCacheState = {
  generation: 0,
  lastSuccessfulRefreshGeneration: 0,
  inFlight: null,
  inFlightGeneration: 0,
  entry: null,
};

export const resetCostRouteCache = (): void => {
  routeCache.generation = 0;
  routeCache.lastSuccessfulRefreshGeneration = 0;
  routeCache.inFlight = null;
  routeCache.inFlightGeneration = 0;
  routeCache.entry = null;
};

const maybeStoreCache = ({
  response,
  generation,
  refresh,
}: {
  response: CostResponse;
  generation: number;
  refresh: boolean;
}): void => {
  if (response.unavailableReason !== null) {
    return;
  }
  const currentGeneration = routeCache.entry?.generation ?? 0;
  const canWrite = refresh
    ? generation >= currentGeneration
    : generation >= currentGeneration && generation > routeCache.lastSuccessfulRefreshGeneration;
  if (!canWrite) {
    return;
  }
  routeCache.entry = {
    response,
    expiresAtMs: Date.now() + ROUTE_CACHE_TTL_MS,
    generation,
  };
  if (refresh) {
    routeCache.lastSuccessfulRefreshGeneration = generation;
  }
};

const getCostRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/cost',
  options: {
    access: 'internal',
    summary: 'Get approximate Significant Events inference cost',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    query: z
      .object({
        refresh: optionalBooleanQuery,
      })
      .strict()
      .optional(),
  }),
  handler: async ({
    params,
    request,
    server,
    getScopedClients,
    priceService,
  }): Promise<CostResponse> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    await assertCanManageRunQuotas({ request, server });

    const refresh = params?.query?.refresh === true;
    const nowMs = Date.now();
    if (!refresh && routeCache.entry && nowMs < routeCache.entry.expiresAtMs) {
      return routeCache.entry.response;
    }
    if (!refresh && routeCache.inFlight) {
      return routeCache.inFlight;
    }

    const generation = ++routeCache.generation;
    const pending = (async (): Promise<CostResponse> => {
      const now = new Date();
      const logger = server.logger.get('cost');
      try {
        const [priceResult, trackingCoverage] = await Promise.all([
          priceService.getPrices(),
          resolveTokenTrackingCoverage({ request, server, logger }),
        ]);
        if (priceResult === null) {
          return createUnavailableCostResponse({
            now,
            reason: 'pricing',
            pricesFetchedAt: null,
            pricesStale: false,
            trackingCoverage,
          });
        }
        const response = await calculateSignificantEventsCost({
          esClient: server.core.elasticsearch.client.asInternalUser,
          prices: priceResult.prices,
          pricesFetchedAt: priceResult.fetchedAt,
          pricesStale: priceResult.stale,
          trackingCoverage,
          now,
          logger,
        });
        maybeStoreCache({ response, generation, refresh });
        return response;
      } finally {
        if (!refresh && routeCache.inFlightGeneration === generation) {
          routeCache.inFlight = null;
          routeCache.inFlightGeneration = 0;
        }
      }
    })();

    if (!refresh) {
      routeCache.inFlight = pending;
      routeCache.inFlightGeneration = generation;
    }
    return pending;
  },
});

export const internalCostRoutes = {
  ...getCostRoute,
};
