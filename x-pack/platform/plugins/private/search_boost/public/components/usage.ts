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
  /** Left out when any size couldn't be loaded, since a partial total would look complete. */
  storageSizeInBytes?: number;
}

export const getUsage = (matches: BoostRuleMatch[]): BoostUsage => {
  const applied = matches.filter(({ outrankedByRuleName }) => !outrankedByRuleName);
  return {
    appliesTo: applied.length,
    storageSizeInBytes: applied.some(({ storageSizeInBytes }) => storageSizeInBytes === undefined)
      ? undefined
      : applied.reduce((total, { storageSizeInBytes = 0 }) => total + storageSizeInBytes, 0),
  };
};
