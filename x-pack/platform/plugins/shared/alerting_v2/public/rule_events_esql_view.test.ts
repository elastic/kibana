/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRuleEventsEsqlQuery } from './rule_events_esql_view';

describe('buildRuleEventsEsqlQuery', () => {
  it('builds a valid WHERE clause for a plain rule id', () => {
    expect(buildRuleEventsEsqlQuery('rule-abc')).toBe(
      'FROM .rule-events | WHERE rule.id == "rule-abc"'
    );
  });

  it('escapes double quotes in the rule id', () => {
    expect(buildRuleEventsEsqlQuery('abc"def')).toBe(
      'FROM .rule-events | WHERE rule.id == "abc\\"def"'
    );
  });

  it('escapes backslashes before quotes so literals stay well-formed', () => {
    expect(buildRuleEventsEsqlQuery('a\\b"c')).toBe(
      'FROM .rule-events | WHERE rule.id == "a\\\\b\\"c"'
    );
  });

  it('escapes newlines, carriage returns, and tabs', () => {
    expect(buildRuleEventsEsqlQuery('a\nb\rc\td')).toBe(
      'FROM .rule-events | WHERE rule.id == "a\\nb\\rc\\td"'
    );
  });
});
