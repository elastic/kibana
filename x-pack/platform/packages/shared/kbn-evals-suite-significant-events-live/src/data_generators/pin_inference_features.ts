/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_TRIAGE_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';

const INFERENCE_SETTINGS_PATH = '/internal/search_inference_endpoints/settings';
const INFERENCE_SETTINGS_API_VERSION = '1';

const PINNED_FEATURE_IDS = [
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID,
  SIGNIFICANT_EVENTS_TRIAGE_INFERENCE_FEATURE_ID,
] as const;

/**
 * Pin every LLM stage of the significant-events pipeline (KI extraction, query generation,
 * discovery, triage) to one connector, so a live replay experiment measures a single evaluated
 * model end to end instead of the product's per-feature recommended defaults.
 */
export async function pinInferenceFeaturesToConnector(
  kbnClient: KbnClient,
  log: ToolingLog,
  connectorId: string
): Promise<void> {
  await kbnClient.request({
    path: INFERENCE_SETTINGS_PATH,
    method: 'PUT',
    headers: { 'elastic-api-version': INFERENCE_SETTINGS_API_VERSION },
    body: {
      features: PINNED_FEATURE_IDS.map((featureId) => ({
        feature_id: featureId,
        endpoints: [{ id: connectorId }],
      })),
    },
  });
  log.info(
    `Pinned inference features [${PINNED_FEATURE_IDS.join(', ')}] to connector "${connectorId}"`
  );
}

/**
 * Clear the per-feature overrides so subsequent runs (or the product itself) fall back to the
 * recommended defaults. The settings API is a whole-object PUT, so the reset body must contain
 * NO per-feature entries: an entry with an empty endpoint list is an explicit "no connector"
 * override that the resolver honours without falling back to defaults. Failures are logged, not
 * thrown — the eval cluster is ephemeral and a leftover pin must not mask the run's actual result.
 */
export async function clearInferenceFeaturePins(
  kbnClient: KbnClient,
  log: ToolingLog
): Promise<void> {
  try {
    await kbnClient.request({
      path: INFERENCE_SETTINGS_PATH,
      method: 'PUT',
      headers: { 'elastic-api-version': INFERENCE_SETTINGS_API_VERSION },
      body: { features: [] },
    });
    log.debug('Cleared inference feature pins');
  } catch (error) {
    log.warning(
      `Failed to clear inference feature pins: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
