/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type BoostProfileType = 'indices' | 'data_streams';

/** An index or data stream that a boost rule matches. */
export interface BoostRuleMatch {
  name: string;
  isHidden: boolean;
  /** Name of the higher-ranked rule that applies to this match instead. */
  outrankedByRuleName?: string;
}
