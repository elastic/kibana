/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RolloverAction } from '@kbn/index-lifecycle-management-common-shared';

const CONTROLLED_ROLLOVER_THRESHOLDS: ReadonlyArray<string> = [
  'max_age',
  'max_docs',
  'max_primary_shard_size',
  'max_primary_shard_docs',
  'max_size',
  'min_age',
  'min_docs',
  'min_primary_shard_size',
  'min_primary_shard_docs',
  'min_size',
] satisfies Array<keyof RolloverAction>;

/**
 * Preserve rollover keys not controlled by the UI when resetting controlled thresholds.
 */
export const excludeControlledRolloverThresholds = (rolloverAction: RolloverAction) =>
  Object.entries(rolloverAction).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (CONTROLLED_ROLLOVER_THRESHOLDS.includes(key)) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
