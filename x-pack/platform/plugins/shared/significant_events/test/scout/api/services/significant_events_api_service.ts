/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import type { KbnClient, ScoutLogger } from '@kbn/scout/src/common';
import { measurePerformanceAsync } from '@kbn/scout/src/common';
import { COMMON_API_HEADERS } from '../fixtures/constants';
import { SIGNIFICANT_EVENTS_MEMORY_ENABLED_FLAG } from '../../../../common';

export interface SignificantEventsTestApiService {
  runSignificantEventsDiscovery: () => Promise<{ executionId: string }>;
  cancelSignificantEventsDiscovery: () => Promise<{ executionId: string | null }>;
  getSignificantEventsDiscoveryStatus: () => Promise<{
    status: string;
    executionId: string | null;
  }>;
  enableSignificantEvents: () => Promise<void>;
  disableSignificantEvents: () => Promise<void>;
  enableMemory: () => Promise<void>;
  disableMemory: () => Promise<void>;
}

export function getSignificantEventsTestApiService({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
}): SignificantEventsTestApiService {
  return {
    async enableSignificantEvents() {
      await measurePerformanceAsync(
        log,
        'significantEventsTestApi.enableSignificantEvents',
        async () => {
          await kbnClient.uiSettings.update({
            [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
          });
        }
      );
    },

    async disableSignificantEvents() {
      await measurePerformanceAsync(
        log,
        'significantEventsTestApi.disableSignificantEvents',
        async () => {
          await kbnClient.uiSettings.update({
            [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: false,
          });
        }
      );
    },

    async enableMemory() {
      await measurePerformanceAsync(log, 'significantEventsTestApi.enableMemory', async () => {
        await kbnClient.request({
          path: '/internal/core/_settings',
          method: 'PUT',
          headers: COMMON_API_HEADERS,
          body: {
            'feature_flags.overrides': {
              [SIGNIFICANT_EVENTS_MEMORY_ENABLED_FLAG]: true,
            },
          },
        });
      });
    },

    async disableMemory() {
      await measurePerformanceAsync(log, 'significantEventsTestApi.disableMemory', async () => {
        await kbnClient.request({
          path: '/internal/core/_settings',
          method: 'PUT',
          headers: COMMON_API_HEADERS,
          body: {
            'feature_flags.overrides': {
              [SIGNIFICANT_EVENTS_MEMORY_ENABLED_FLAG]: false,
            },
          },
        });
      });
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
