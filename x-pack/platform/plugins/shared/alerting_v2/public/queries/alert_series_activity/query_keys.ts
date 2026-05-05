/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * React-query cache keys for the rule details overview tab. Owned by this
 * feature folder; the `@kbn/alerting-v2-episodes-ui` package owns its own
 * episode-scoped key namespace separately.
 */
export const ruleOverviewQueryKeys = {
  all: ['alerting-v2', 'rule-overview'] as const,
  ruleEvents: (ruleId: string, gteMs: number, lteMs: number, pageSize: number) =>
    [...ruleOverviewQueryKeys.all, 'rule-events', ruleId, gteMs, lteMs, pageSize] as const,
  seriesGroupingValues: (
    ruleId: string,
    gteMs: number,
    lteMs: number,
    groupHashes: readonly string[],
    groupingFields: readonly string[]
  ) =>
    [
      ...ruleOverviewQueryKeys.all,
      'series-grouping-values',
      ruleId,
      gteMs,
      lteMs,
      [...groupHashes].sort(),
      [...groupingFields].sort(),
    ] as const,
};
