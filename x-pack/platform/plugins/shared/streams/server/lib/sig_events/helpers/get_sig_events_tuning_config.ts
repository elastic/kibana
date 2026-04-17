/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { OBSERVABILITY_STREAMS_SIG_EVENTS_TUNING_CONFIG } from '@kbn/management-settings-ids';
import {
  DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  type SigEventsTuningConfig,
} from '../../../../common/sig_events_tuning_config';

/**
 * Reads the tuning config from global uiSettings, merging with defaults
 * for any missing keys. If the stored config is invalid, logs a warning
 * and returns full defaults.
 */
export async function getSigEventsTuningConfig(
  globalUiSettingsClient: IUiSettingsClient,
  logger: Logger
): Promise<SigEventsTuningConfig> {
  let stored: Partial<SigEventsTuningConfig>;
  try {
    stored = await globalUiSettingsClient.get<Partial<SigEventsTuningConfig>>(
      OBSERVABILITY_STREAMS_SIG_EVENTS_TUNING_CONFIG
    );
  } catch {
    // Setting not found or unparseable -- use all defaults
    return { ...DEFAULT_SIG_EVENTS_TUNING_CONFIG };
  }

  const merged = { ...DEFAULT_SIG_EVENTS_TUNING_CONFIG, ...stored };

  // Detect corruption -- don't fix, log and fall back to full defaults
  if (merged.entity_filtered_ratio + merged.diverse_ratio > 1.0) {
    logger.warn(
      `Significant Events tuning config has invalid sampling ratios ` +
        `(entity_filtered_ratio=${merged.entity_filtered_ratio}, ` +
        `diverse_ratio=${merged.diverse_ratio}, sum > 1.0). ` +
        `Falling back to default config. Fix the config in the Settings page.`
    );
    return { ...DEFAULT_SIG_EVENTS_TUNING_CONFIG };
  }

  return merged;
}
