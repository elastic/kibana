/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout/src/common';
import { measurePerformanceAsync } from '@kbn/scout/src/common';
import { COMMON_API_HEADERS } from '../fixtures/constants';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '../../../../common';

export interface SignificantEventsTestApiService {
  runSignificantEventsDiscovery: () => Promise<{ executionId: string }>;
  cancelSignificantEventsDiscovery: () => Promise<{ executionId: string | null }>;
  getSignificantEventsDiscoveryStatus: () => Promise<{
    status: string;
    executionId: string | null;
  }>;
  enableSignificantEvents: () => Promise<void>;
  disableSignificantEvents: () => Promise<void>;
}

export function getSignificantEventsTestApiService({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}): SignificantEventsTestApiService {
  // Suites should rely on global.setup.ts / global.teardown.ts for the default availability
  // override. These helpers are only for intentional mid-test toggles (e.g. asserting a 403 when
  // the flag is off) — do not wrap an entire describe in enable/disable, since that races with
  // sibling suites if Playwright ever runs with workers > 1.
  const setAvailability = async (enabled: boolean) => {
    await kbnClient.request({
      path: '/internal/core/_settings',
      method: 'PUT',
      headers: COMMON_API_HEADERS,
      body: {
        'feature_flags.overrides': {
          [STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG]: enabled,
        },
      },
    });
  };

  return {
    async enableSignificantEvents() {
      await measurePerformanceAsync(
        log,
        'significantEventsTestApi.enableSignificantEvents',
        async () => {
          await setAvailability(true);
        }
      );
    },

    async disableSignificantEvents() {
      await measurePerformanceAsync(
        log,
        'significantEventsTestApi.disableSignificantEvents',
        async () => {
          await setAvailability(false);
        }
      );
    },

    async runSignificantEventsDiscovery() {
      return measurePerformanceAsync(
        log,
        'significantEventsTestApi.runSignificantEventsDiscovery',
        async () => {
          const response = await kbnClient.request({
            method: 'POST',
            path: '/internal/streams/significant_events/discovery/_execute',
            body: { action: 'trigger' },
          });
          return response.data as { executionId: string };
        }
      );
    },

    async cancelSignificantEventsDiscovery() {
      return measurePerformanceAsync(
        log,
        'significantEventsTestApi.cancelSignificantEventsDiscovery',
        async () => {
          const response = await kbnClient.request({
            method: 'POST',
            path: '/internal/streams/significant_events/discovery/_execute',
            body: { action: 'cancel' },
          });
          return response.data as { executionId: string | null };
        }
      );
    },

    async getSignificantEventsDiscoveryStatus() {
      return measurePerformanceAsync(
        log,
        'significantEventsTestApi.getSignificantEventsDiscoveryStatus',
        async () => {
          const response = await kbnClient.request({
            method: 'GET',
            path: '/internal/streams/significant_events/discovery/_status',
          });
          return response.data as { status: string; executionId: string | null };
        }
      );
    },
  };
}
