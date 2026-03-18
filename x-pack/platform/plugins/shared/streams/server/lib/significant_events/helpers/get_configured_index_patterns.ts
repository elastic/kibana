/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelSettingsConfigClient } from '../../saved_objects/significant_events/model_settings_config_client';

const DEFAULT_INDEX_PATTERNS = 'logs*';

/**
 * Gets the configured index patterns for significant events discovery.
 * Falls back to the default pattern if not configured.
 */
export async function getConfiguredIndexPatterns(
  modelSettingsClient: ModelSettingsConfigClient
): Promise<string[]> {
  const settings = await modelSettingsClient.getSettings();
  const configuredPatterns = settings.indexPatterns || DEFAULT_INDEX_PATTERNS;

  // Split by comma and trim whitespace
  return configuredPatterns
    .split(',')
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);
}

/**
 * Gets the configured index patterns as a comma-separated string.
 * Useful for Elasticsearch queries that expect a comma-separated list.
 */
export async function getConfiguredIndexPatternsString(
  modelSettingsClient: ModelSettingsConfigClient
): Promise<string> {
  const patterns = await getConfiguredIndexPatterns(modelSettingsClient);
  return patterns.join(',');
}

/**
 * Synchronous version that returns the default patterns.
 * Use when you need the default value without async configuration lookup.
 */
export function getDefaultIndexPatterns(): string[] {
  return DEFAULT_INDEX_PATTERNS.split(',').map((pattern) => pattern.trim());
}

export { streamMatchesIndexPatterns } from '../../../../common/stream_matches_index_patterns';
