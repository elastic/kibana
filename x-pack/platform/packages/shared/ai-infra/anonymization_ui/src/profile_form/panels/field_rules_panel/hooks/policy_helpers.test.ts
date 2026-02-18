/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldRule } from '@kbn/anonymization-common';
import {
  FIELD_RULE_ACTION_ALLOW,
  FIELD_RULE_ACTION_ANONYMIZE,
  FIELD_RULE_ACTION_DENY,
} from '../../../hooks/field_rule_actions';
import { countPolicies, toActionOption } from './policy_helpers';

describe('policy_helpers', () => {
  it('counts allow/anonymize/deny policies from field rules', () => {
    const rules: FieldRule[] = [
      { field: 'host.name', allowed: true, anonymized: false },
      { field: 'user.email', allowed: true, anonymized: true, entityClass: 'EMAIL' },
      { field: 'event.original', allowed: false, anonymized: false },
    ];

    expect(countPolicies(rules)).toEqual({
      allow: 1,
      anonymize: 1,
      deny: 1,
    });
  });

  it('returns zero counters for empty rules', () => {
    expect(countPolicies([])).toEqual({
      allow: 0,
      anonymize: 0,
      deny: 0,
    });
  });

  it.each([
    [FIELD_RULE_ACTION_ALLOW, 'Allow'],
    [FIELD_RULE_ACTION_ANONYMIZE, 'Anonymize'],
    [FIELD_RULE_ACTION_DENY, 'Deny'],
  ] as const)('builds action option for %s', (value, label) => {
    expect(toActionOption(value, label)).toEqual({
      id: value,
      label,
    });
  });
});
