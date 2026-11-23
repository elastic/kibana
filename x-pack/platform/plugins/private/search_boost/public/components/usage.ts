/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostRuleMatch } from '../../common/types';

export interface BoostUsage {
  /** What the rules match, less any that higher-ranked rules apply to instead. */
  appliesTo: number;
  storageSizeInBytes: number;
}

export const getUsage = (matches: BoostRuleMatch[]): BoostUsage =>
  matches
    .filter(({ outrankedByRuleName }) => !outrankedByRuleName)
    .reduce<BoostUsage>(
      (usage, { storageSizeInBytes = 0 }) => ({
        appliesTo: usage.appliesTo + 1,
        storageSizeInBytes: usage.storageSizeInBytes + storageSizeInBytes,
      }),
      { appliesTo: 0, storageSizeInBytes: 0 }
    );
