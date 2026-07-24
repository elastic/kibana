/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { toRuleDefinition } from './rule_orchestration';
import {
  METRIC_SERIES_EVERY,
  METRIC_SERIES_RULE_NAME_SUFFIX,
} from '../../significant_events/rules/metric_series_contract';

const makeQueryLink = (severityScore?: number): QueryLink => ({
  query: {
    id: 'query-1',
    type: 'match',
    title: 'Error logs',
    description: 'Matches error logs',
    esql: { query: 'FROM logs-* | WHERE level == "error"' },
    severity_score: severityScore,
  },
  stream_name: 'logs.test',
  rule_backed: true,
  rule_id: 'rule-1',
});

describe('toRuleDefinition', () => {
  it('maps a query link to the v2-native Significant Events rule definition', () => {
    // Severity no longer changes execution cadence — critical vs default only
    // affects analysis profiles, so a high score still uses METRIC_SERIES_EVERY.
    expect(toRuleDefinition(makeQueryLink(85))).toEqual({
      name: `Error logs${METRIC_SERIES_RULE_NAME_SUFFIX}`,
      streamName: 'logs.test',
      timestampField: '@timestamp',
      esqlQuery: 'FROM logs-* | WHERE level == "error"',
      schedule: { interval: METRIC_SERIES_EVERY },
    });
  });
});
