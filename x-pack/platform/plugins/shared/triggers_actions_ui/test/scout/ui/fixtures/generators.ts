/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture } from '@kbn/scout';

// Prefix sorts these rules to the top of the list when sorted alphabetically.
export const RULE_NAMES = {
  FIRST_RULE_TEST: '!!! - Scout - First Rule Test',
  RULE_DETAILS_TEST: '!!! - Scout - Rule Details Test',
} as const;

export const INDEX_THRESHOLD_RULE_TYPE_ID = '.index-threshold';

const INDEX_THRESHOLD_PARAMS = {
  aggType: 'count',
  termSize: 5,
  thresholdComparator: '>',
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  groupBy: 'all',
  threshold: [1000],
  index: ['.kibana'],
  timeField: '@timestamp',
} as const;

export interface CreateIndexThresholdRuleOptions {
  name?: string;
  enabled?: boolean;
  consumer?: string;
}

/**
 * Creates a disabled index-threshold rule for tests that just need *a* rule to exist
 * (e.g. redirect tests or rules-list seeding). Disabled by default to avoid execution noise.
 */
export async function createIndexThresholdRule(
  apiServices: ApiServicesFixture,
  { name, enabled = false, consumer = 'alerts' }: CreateIndexThresholdRuleOptions = {}
) {
  const ruleName = name ?? `Scout Test Rule ${Date.now()}`;
  const response = await apiServices.alerting.rules.create({
    name: ruleName,
    ruleTypeId: INDEX_THRESHOLD_RULE_TYPE_ID,
    consumer,
    enabled,
    schedule: { interval: '1m' },
    actions: [],
    params: INDEX_THRESHOLD_PARAMS,
    tags: ['scout'],
  });
  return response.data;
}
