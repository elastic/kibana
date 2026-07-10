/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import { toCreateRuleBody, toUpdateRuleBody } from './rule_orchestration';

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

describe('rule orchestration bodies', () => {
  it.each([
    [85, '1m'],
    [80, '1m'],
    [60, '5m'],
    [undefined, '5m'],
  ])('sets create schedule for severity %s to %s', (severityScore, expectedInterval) => {
    expect(toCreateRuleBody(makeQueryLink(severityScore)).schedule.interval).toBe(expectedInterval);
  });

  it.each([
    [85, '1m'],
    [80, '1m'],
    [60, '5m'],
    [undefined, '5m'],
  ])('sets update schedule for severity %s to %s', (severityScore, expectedInterval) => {
    expect(toUpdateRuleBody(makeQueryLink(severityScore)).schedule.interval).toBe(expectedInterval);
  });
});
