/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, ExtractionMode } from '../../../common/domain/definitions/entity_schema';
import { EXTRACTION_MODE } from '../../../common/domain/definitions/entity_schema';
import type { LogExtractionConfig, LogExtractionTypeOverride } from '../saved_objects';
import {
  LATEST_LOG_EXTRACTION_DEFAULTS,
  LogExtractionConfig as LogExtractionConfigSchema,
} from '../saved_objects';

/** Built-in per entity-type defaults. Empty for now: raising frequency also cuts throughput, so values need measurement (#269261). */
export const DEFAULT_CONFIG_BY_TYPE: Partial<Record<EntityType, Partial<LogExtractionConfig>>> = {};

/**
 * Built-in per-process defaults.
 *
 * The cap behaviours differ by design. Priority carries the no-intentional-loss commitment, so on
 * hitting the volume cap it defers and resumes from the same position rather than skipping ahead.
 * Non-priority is best-effort over much higher volume, so it drops past the remaining logs to stay
 * current.
 *
 * Both run on the same cadence for now. A longer interval for the high-volume process is proposed
 * but not decided; the two processes resolve their frequency independently, so changing it is a
 * one-line edit here.
 *
 * `single` is empty: with the feature flag off, behaviour must stay exactly as it is today.
 */
export const DEFAULT_CONFIG_BY_MODE: Record<ExtractionMode, Partial<LogExtractionConfig>> = {
  single: {},
  priority: {
    frequency: '1m',
    maxLogsPerWindowCapBehavior: 'defer',
  },
  nonPriority: {
    frequency: '1m',
    maxLogsPerWindowCapBehavior: 'drop',
  },
};

/** A layer's set fields. `undefined` and `null` are dropped, so they fall through to the layers below. */
const setFields = (
  layer: Partial<LogExtractionTypeOverride> | Partial<LogExtractionConfig> | undefined
): Partial<LogExtractionConfig> =>
  Object.fromEntries(
    Object.entries(layer ?? {}).filter(([, value]) => value !== null && value !== undefined)
  ) as Partial<LogExtractionConfig>;

/**
 * Config in effect for one entity type and extraction process: code defaults, then the per-type
 * defaults, then the per-process defaults, then `globalOverrides`, then `typeOverride`.
 *
 * The process layer sits below both override layers, so anything a customer has set explicitly
 * still wins over the built-in per-process values.
 */
export const getMergedConfig = (
  type: EntityType,
  globalOverrides: Partial<LogExtractionConfig>,
  typeOverride: LogExtractionTypeOverride | undefined,
  extractionMode: ExtractionMode = EXTRACTION_MODE.single
): LogExtractionConfig =>
  LogExtractionConfigSchema.parse({
    ...LATEST_LOG_EXTRACTION_DEFAULTS,
    ...DEFAULT_CONFIG_BY_TYPE[type],
    ...DEFAULT_CONFIG_BY_MODE[extractionMode],
    ...setFields(globalOverrides),
    ...setFields(typeOverride),
  });
