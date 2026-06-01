/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { OBSERVABILITY_STREAMS_SIG_EVENTS_LINKED_CODE_INDICES } from '@kbn/management-settings-ids';

/**
 * Map of stream name (or glob pattern) to the Semantic Code Search index that
 * holds its source code. Stored as a single JSON object in the global
 * `streamsSigEventsLinkedCodeIndices` setting. The per-stream UI only edits its
 * own entry.
 */
export type LinkedCodeIndices = Record<string, string>;

/** Parses the raw setting value into a map, tolerating invalid/empty input. */
export const parseLinkedCodeIndices = (raw: unknown): LinkedCodeIndices => {
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }
    const result: LinkedCodeIndices = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (typeof entry === 'string' && entry.length > 0) {
        result[key] = entry;
      }
    }
    return result;
  } catch {
    return {};
  }
};

/**
 * Returns an updated JSON string for the linked-code-indices setting with the
 * given stream's entry set to `value`, or removed when `value` is empty.
 * Pure — does not touch any client.
 */
export const upsertLinkedCodeIndex = (raw: unknown, streamName: string, value: string): string => {
  const mapping = parseLinkedCodeIndices(raw);
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    delete mapping[streamName];
  } else {
    mapping[streamName] = trimmed;
  }
  return JSON.stringify(mapping);
};

/** Reads the current linked code index for a single stream (empty string when unset). */
export const readLinkedCodeIndex = (
  globalUiSettingsClient: IUiSettingsClient,
  streamName: string
): string => {
  const raw = globalUiSettingsClient.get<unknown>(
    OBSERVABILITY_STREAMS_SIG_EVENTS_LINKED_CODE_INDICES,
    '{}'
  );
  return parseLinkedCodeIndices(raw)[streamName] ?? '';
};

/** Persists the linked code index for a single stream, leaving other entries intact. */
export const writeLinkedCodeIndex = async (
  globalUiSettingsClient: IUiSettingsClient,
  streamName: string,
  value: string
): Promise<void> => {
  const raw = globalUiSettingsClient.get<unknown>(
    OBSERVABILITY_STREAMS_SIG_EVENTS_LINKED_CODE_INDICES,
    '{}'
  );
  await globalUiSettingsClient.set(
    OBSERVABILITY_STREAMS_SIG_EVENTS_LINKED_CODE_INDICES,
    upsertLinkedCodeIndex(raw, streamName, value)
  );
};
