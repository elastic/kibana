/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRuleScopedMatcher } from './rule_scoped_action_policies';

describe('buildRuleScopedMatcher', () => {
  it('scopes the matcher expression to the rule id', () => {
    expect(buildRuleScopedMatcher('rule-1')).toEqual({ expression: 'rule.id: "rule-1"' });
  });
});
