/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import { globalSetupHook } from '@kbn/scout';
import {
  STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG,
  type SignificantEventsAvailabilityResponse,
} from '../../../../common';
import { COMMON_API_HEADERS } from '../fixtures/constants';

const AVAILABILITY_PATH = '/internal/significant_events/availability';
const AVAILABILITY_TIMEOUT_MS = 30_000;
const AVAILABILITY_POLL_INTERVAL_MS = 1_000;

globalSetupHook(
  'Setup environment for Significant Events API tests',
  async ({ apiServices, kbnClient, log }) => {
    log.debug('[setup] Enabling Streams...');
    await apiServices.streams.enable();
    log.debug('[setup] Streams enabled successfully');

    // Significant events is gated behind the streams.significantEventsAvailable feature flag, which
    // falls back to false. Force it on as the sole availability gate for the API tests.
    log.debug('[setup] Enabling significant events availability feature flag...');
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG]: true,
      },
    });

    // Gate setup on the flag being observably effective: the override applies only on the node that
    // handles the PUT and reaches other Cloud instances on their next ~10s config poll, so specs
    // would otherwise race that propagation window and read the `false` fallback.
    log.debug('[setup] Waiting for significant events availability to propagate...');
    const deadline = Date.now() + AVAILABILITY_TIMEOUT_MS;
    let lastResponse: SignificantEventsAvailabilityResponse | undefined;
    while (Date.now() < deadline) {
      const { data, status } = await kbnClient.request<SignificantEventsAvailabilityResponse>({
        path: AVAILABILITY_PATH,
        method: 'GET',
        headers: COMMON_API_HEADERS,
        ignoreErrors: [404],
      });
      // A 404 means the plugin is unloaded for this deployment (e.g. Logs Essentials sets
      // `xpack.significantEvents.enabled: false`), so there is no availability to wait for.
      if (status === 404) {
        log.debug('[setup] Significant events plugin not loaded (404); skipping availability gate');
        return;
      }
      lastResponse = data;
      if (data.available) {
        log.debug('[setup] Significant events availability confirmed');
        return;
      }
      await delay(AVAILABILITY_POLL_INTERVAL_MS);
    }

    throw new Error(
      `Significant events did not become available within ${AVAILABILITY_TIMEOUT_MS}ms of enabling the feature flag. Last availability response: ${JSON.stringify(
        lastResponse
      )}`
    );
  }
);
