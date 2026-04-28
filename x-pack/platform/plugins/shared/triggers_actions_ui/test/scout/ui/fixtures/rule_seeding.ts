/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture } from '@kbn/scout';

export const ES_QUERY_RULE_TYPE_ID = '.es-query';

/**
 * Rule names used by the unified rules scout specs.
 *
 * The leading `!!! - Scout - ` prefix guarantees that these rules sort to the top of
 * the unified rules table, so specs can interact with them deterministically without
 * relying on pagination or filtering.
 */
export const RULE_NAMES = {
  FIRST_RULE_TEST: '!!! - Scout - First Rule Test',
  RULE_DETAILS_TEST: '!!! - Scout - Rule Details Test',
} as const;

const buildEsQueryParams = () => ({
  searchType: 'esQuery',
  esQuery: JSON.stringify({ query: { match_all: {} } }),
  index: ['.kibana'],
  timeField: '@timestamp',
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  threshold: [1000],
  thresholdComparator: '>',
  size: 100,
  aggType: 'count',
  groupBy: 'all',
  termSize: 5,
  excludeHitsFromPreviousRun: false,
  sourceFields: [],
});

/**
 * Ensure the fixture rules needed by the relocated rules specs exist, creating any that are
 * missing.
 *
 * Rules are created enabled so they produce event-log entries that the logs-tab spec can click
 * through. The configured threshold is unreachable against `.kibana`, so enabling them does not
 * produce alerts — only `active-but-OK` executions in the rule event log.
 */
export async function seedRulesForTests(apiServices: ApiServicesFixture): Promise<void> {
  const names = Object.values(RULE_NAMES);
  const searchQuery = names.join(' OR ');
  const existing = await apiServices.alerting.rules.find({ search: searchQuery });
  const existingNames = new Set(existing?.data?.data?.map((r: { name: string }) => r.name) ?? []);

  const missing = names.filter((name) => !existingNames.has(name));

  for (const name of missing) {
    await apiServices.alerting.rules.create({
      name,
      ruleTypeId: ES_QUERY_RULE_TYPE_ID,
      consumer: 'logs',
      schedule: { interval: '1m' },
      actions: [],
      params: buildEsQueryParams(),
    });
  }
}
