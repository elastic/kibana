/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType, ExtractionMode } from '../../../common/domain/definitions/entity_schema';
import { EXTRACTION_MODE } from '../../../common/domain/definitions/entity_schema';
import { supportsNonPrioritySampling } from '../../../common/domain/definitions/registry';
import type {
  LogExtractionConfig,
  LogExtractionTypeOverride,
  NonPriorityLogExtractionTypeOverride,
} from '../saved_objects';
import {
  LATEST_LOG_EXTRACTION_DEFAULTS,
  LogExtractionConfig as LogExtractionConfigSchema,
} from '../saved_objects';

/**
 * Built-in per entity-type defaults. Raising frequency here also lowers the effective per-run
 * volume cap for that type, since maxLogsPerWindow is a fixed per-execution budget, not a
 * per-time-unit rate.
 */
export const DEFAULT_CONFIG_BY_TYPE: Partial<Record<EntityType, Partial<LogExtractionConfig>>> = {
  service: { frequency: '10m' },
  generic: { frequency: '30m' },
};

/**
 * Built-in per-process defaults.
 *
 * The cap behaviours differ by design. Priority carries the no-intentional-loss commitment, so on
 * hitting the volume cap it defers and resumes from the same position rather than skipping ahead.
 * Non-priority is best-effort over much higher volume, so it drops past the remaining logs to stay
 * current.
 *
 * No `frequency` here: it would be identical to the code default and would only serve to clobber
 * DEFAULT_CONFIG_BY_TYPE for gated types, since this layer is merged after it.
 *
 * `single` is empty: with the feature flag off, behaviour must stay exactly as it is today.
 */
export const DEFAULT_CONFIG_BY_MODE: Record<ExtractionMode, Partial<LogExtractionConfig>> = {
  single: {},
  priority: {
    maxLogsPerWindowCapBehavior: 'defer',
  },
  nonPriority: {
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
 * Fields that control log extraction volume and throughput behaviour. These are exclusive to the
 * non-priority process — the shared layers must not reach them, so the process-mode defaults
 * (e.g. maxLogsPerWindowCapBehavior: 'drop') and the nonPriorityLogExtractionConfig layer are
 * the only way to set them for non-priority.
 */
export const NON_PRIORITY_EXCLUSIVE_FIELDS = new Set<keyof LogExtractionConfig>([
  'maxLogsPerPage',
  'maxTimeWindowSize',
  'maxLogsPerWindow',
  'maxLogsPerWindowCapBehavior',
  'docsLimit',
]);

/** A shared layer's set fields, minus the ones only the non-priority layer may set. */
const setNonExclusiveFields = (
  layer: Partial<LogExtractionTypeOverride> | Partial<LogExtractionConfig> | undefined
): Partial<LogExtractionConfig> =>
  Object.fromEntries(
    Object.entries(layer ?? {}).filter(
      ([key, value]) =>
        value !== null &&
        value !== undefined &&
        !NON_PRIORITY_EXCLUSIVE_FIELDS.has(key as keyof LogExtractionConfig)
    )
  ) as Partial<LogExtractionConfig>;

/**
 * Converts a `NonPriorityLogExtractionTypeOverride` to the subset that belongs in
 * `LogExtractionConfig`. `samplingRate` is not a shared config field; it is attached to the
 * merged result separately, and only for sampling-capable non-priority processes.
 */
const setNonPriorityFields = (
  layer: NonPriorityLogExtractionTypeOverride | undefined
): Partial<LogExtractionConfig> => {
  const { samplingRate: _samplingRate, ...rest } = layer ?? {};
  return Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== null && value !== undefined)
  ) as Partial<LogExtractionConfig>;
};

/**
 * Resolved config for one entity type and process. `samplingRate` exists only on the config of a
 * non-priority process whose entity type declares the sampling capability; every other process
 * resolves a config without the key.
 */
export type MergedLogExtractionConfig = LogExtractionConfig & { samplingRate?: number };

/**
 * Config in effect for one entity type and extraction process.
 *
 * Shared base (all modes):
 *   code defaults → per-type code defaults → per-process defaults → globalOverrides
 *
 * For non-priority, both shared layers are filtered: NON_PRIORITY_EXCLUSIVE_FIELDS are stripped
 * so that volume/throughput fields (maxLogsPerPage, maxTimeWindowSize, maxLogsPerWindow,
 * maxLogsPerWindowCapBehavior, docsLimit) cannot be set by the shared API. The non-priority mode
 * default is the floor; nonPriorityLogExtractionConfig is the ceiling.
 *
 * Final layer for single / priority:
 *   all fields from typeOverride
 *
 * Final layer for non-priority:
 *   non-exclusive fields from typeOverride, then nonPriorityOverride
 */
export const getMergedConfig = (
  type: EntityType,
  globalOverrides: Partial<LogExtractionConfig>,
  typeOverride: LogExtractionTypeOverride | undefined,
  extractionMode: ExtractionMode = EXTRACTION_MODE.single,
  nonPriorityOverride?: NonPriorityLogExtractionTypeOverride
): MergedLogExtractionConfig => {
  const base = {
    ...LATEST_LOG_EXTRACTION_DEFAULTS,
    ...DEFAULT_CONFIG_BY_TYPE[type],
    ...DEFAULT_CONFIG_BY_MODE[extractionMode],
    ...(extractionMode === EXTRACTION_MODE.nonPriority
      ? setNonExclusiveFields(globalOverrides)
      : setFields(globalOverrides)),
  };

  const typeFields =
    extractionMode === EXTRACTION_MODE.nonPriority
      ? { ...setNonExclusiveFields(typeOverride), ...setNonPriorityFields(nonPriorityOverride) }
      : setFields(typeOverride);

  const config = LogExtractionConfigSchema.parse({ ...base, ...typeFields });

  const samplingRate =
    extractionMode === EXTRACTION_MODE.nonPriority && supportsNonPrioritySampling(type)
      ? nonPriorityOverride?.samplingRate
      : undefined;

  return samplingRate != null ? { ...config, samplingRate } : config;
};
