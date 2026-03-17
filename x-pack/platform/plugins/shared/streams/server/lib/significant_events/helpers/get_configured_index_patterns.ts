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

/**
 * Checks if a stream name matches the configured index patterns.
 * This replaces the hardcoded check for streams starting with 'logs'.
 */
export function streamMatchesIndexPatterns(streamName: string, indexPatterns: string[]): boolean {
  return indexPatterns.some((pattern) => {
    // Convert glob pattern to regex
    // Escape dots first, then convert glob wildcards
    const regexPattern = pattern
      .replace(/\./g, '\\.') // Escape literal dots first
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(streamName);
  });
}
