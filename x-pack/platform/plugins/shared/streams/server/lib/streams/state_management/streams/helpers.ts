/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import {
  isInheritFailureStore,
  isInheritLifecycle,
  type IngestStreamSettings,
} from '@kbn/streams-schema';

interface ComputeChangeOptions {
  /** Whether the stream already exists in the starting state */
  isExistingStream: boolean;
  /** Whether the new value is meaningful (non-empty/non-default) */
  hasMeaningfulValue: boolean;
  /** Whether the value changed compared to the starting state (only evaluated for existing streams) */
  hasChanged: () => boolean;
}

/**
 * Determines if a change flag should be set for a stream property.
 *
 * For existing streams (isExistingStream=true): returns true if the values are not equal (hasChanged)
 * For new streams (isExistingStream=false): returns true if the value is meaningful/non-empty (hasMeaningfulValue)
 */
export function computeChange({
  isExistingStream,
  hasMeaningfulValue,
  hasChanged,
}: ComputeChangeOptions): boolean {
  return isExistingStream ? hasChanged() : hasMeaningfulValue;
}

export function classicIngestHasEsLevelChanges(
  ingest: Streams.ClassicStream.UpsertRequest['stream']['ingest']
) {
  const processingItemCount =
    'processors' in ingest.processing
      ? ingest.processing.processors.length
      : ingest.processing.steps.length;

  return (
    processingItemCount > 0 ||
    !isInheritLifecycle(ingest.lifecycle) ||
    Object.keys(ingest.settings ?? {}).length > 0 ||
    !isInheritFailureStore(ingest.failure_store) ||
    (ingest.classic?.field_overrides && Object.keys(ingest.classic.field_overrides).length > 0)
  );
}

export function formatSettings(settings: IngestStreamSettings, isServerless: boolean) {
  if (isServerless) {
    return {
      'index.refresh_interval': settings['index.refresh_interval']?.value ?? null,
    };
  }

  return {
    'index.number_of_replicas': settings['index.number_of_replicas']?.value ?? null,
    'index.number_of_shards': settings['index.number_of_shards']?.value ?? null,
    'index.refresh_interval': settings['index.refresh_interval']?.value ?? null,
  };
}

export type FormattedIngestSettings = ReturnType<typeof formatSettings>;

/**
 * Maps {@link formatSettings} output (flat `index.*` keys as used by put data stream settings)
 * into nested `template.settings.index` fields for composable index templates. Omits `null`
 * entries so cluster defaults apply.
 */
export function formattedIngestSettingsToTemplateIndexSettings(
  formatted: FormattedIngestSettings
): {
  number_of_replicas?: number;
  number_of_shards?: number;
  refresh_interval?: string | -1;
} {
  const index: {
    number_of_replicas?: number;
    number_of_shards?: number;
    refresh_interval?: string | -1;
  } = {};

  const replicas = formatted['index.number_of_replicas'];
  if (replicas != null) {
    index.number_of_replicas = replicas;
  }

  const shards = formatted['index.number_of_shards'];
  if (shards != null) {
    index.number_of_shards = shards;
  }

  const refresh = formatted['index.refresh_interval'];
  if (refresh != null) {
    index.refresh_interval = refresh;
  }

  return index;
}

export function settingsUpdateRequiresRollover(
  oldSettings: IngestStreamSettings,
  newSettings: IngestStreamSettings
) {
  return (
    oldSettings['index.number_of_shards']?.value !== newSettings['index.number_of_shards']?.value
  );
}
