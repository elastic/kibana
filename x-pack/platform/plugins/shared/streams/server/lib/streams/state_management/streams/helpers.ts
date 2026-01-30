/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamSettings } from '@kbn/streams-schema';

/**
 * Determines if a change flag should be set for a stream property.
 *
 * For existing streams (isExistingStream=true): returns true if the values are not equal (hasChanged)
 * For new streams (isExistingStream=false): returns true if the value is meaningful/non-empty (hasMeaningfulValue)
 *
 * @param isExistingStream - Whether the stream already exists in the starting state
 * @param hasMeaningfulValue - Whether the new value is meaningful (non-empty/non-default)
 * @param hasChanged - Whether the value changed compared to the starting state (only evaluated for existing streams)
 */
export function computeChange(
  isExistingStream: boolean,
  hasMeaningfulValue: boolean,
  hasChanged: () => boolean
): boolean {
  return isExistingStream ? hasChanged() : hasMeaningfulValue;
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

export function settingsUpdateRequiresRollover(
  oldSettings: IngestStreamSettings,
  newSettings: IngestStreamSettings
) {
  return (
    oldSettings['index.number_of_shards']?.value !== newSettings['index.number_of_shards']?.value
  );
}
