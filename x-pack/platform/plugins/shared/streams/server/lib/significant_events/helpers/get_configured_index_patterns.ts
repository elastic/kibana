/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INDEX_PATTERNS } from '@kbn/streams-schema';
import type {
  ModelSettingsConfigClient,
  ModelSettings,
} from '../../saved_objects/significant_events/model_settings_config_client';

/**
 * Resolves index patterns from the given settings string.
 * Falls back to the default pattern if not configured or if the string is empty/whitespace.
 */
export function resolveIndexPatterns(indexPatternsString: string | undefined): string[] {
  const configuredPatterns = indexPatternsString || DEFAULT_INDEX_PATTERNS;

  // Split by comma and trim whitespace
  const normalizedPatterns = configuredPatterns
    .split(',')
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);

  return normalizedPatterns.length > 0 ? normalizedPatterns : getDefaultIndexPatterns();
}

/**
 * Gets the configured index patterns for significant events discovery.
 * Accepts either pre-fetched settings or a client to fetch them.
 * Falls back to the default pattern if not configured.
 */
export async function getConfiguredIndexPatterns(
  modelSettingsClientOrSettings: ModelSettingsConfigClient | ModelSettings
): Promise<string[]> {
  const settings =
    'getSettings' in modelSettingsClientOrSettings
      ? await modelSettingsClientOrSettings.getSettings()
      : modelSettingsClientOrSettings;

  return resolveIndexPatterns(settings.indexPatterns);
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

export { streamMatchesIndexPatterns } from '@kbn/streams-schema';
