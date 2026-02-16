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
} from './field_rule_actions';
import { applyBulkFieldAction, applyFieldAction, rankFieldRules } from './field_rules';

const baseRules: FieldRule[] = [
  { field: 'host.name', allowed: true, anonymized: false },
  { field: 'user.email', allowed: true, anonymized: true, entityClass: 'EMAIL' },
  { field: 'event.action', allowed: true, anonymized: false },
];

describe('field rules helpers', () => {
  it('applies row-level actions', () => {
    const deniedRules = applyFieldAction(baseRules, 'host.name', FIELD_RULE_ACTION_DENY);
    expect(deniedRules.find((rule) => rule.field === 'host.name')).toEqual({
      field: 'host.name',
      allowed: false,
      anonymized: false,
      entityClass: undefined,
    });

    const anonymizedRules = applyFieldAction(baseRules, 'host.name', FIELD_RULE_ACTION_ANONYMIZE, {
      entityClass: 'HOST_NAME',
    });
    expect(anonymizedRules.find((rule) => rule.field === 'host.name')?.anonymized).toBe(true);
    expect(anonymizedRules.find((rule) => rule.field === 'host.name')?.entityClass).toBe(
      'HOST_NAME'
    );
  });

  it('applies allow action and clears anonymization metadata', () => {
    const allowedRules = applyFieldAction(baseRules, 'user.email', FIELD_RULE_ACTION_ALLOW);
    expect(allowedRules.find((rule) => rule.field === 'user.email')).toEqual({
      field: 'user.email',
      allowed: true,
      anonymized: false,
      entityClass: undefined,
    });
  });

  it('uses existing/default entity class when anonymize options are omitted', () => {
    const withExistingEntity = applyFieldAction(
      baseRules,
      'user.email',
      FIELD_RULE_ACTION_ANONYMIZE
    );
    expect(withExistingEntity.find((rule) => rule.field === 'user.email')?.entityClass).toBe(
      'EMAIL'
    );

    const withoutExistingEntity = applyFieldAction(
      baseRules,
      'host.name',
      FIELD_RULE_ACTION_ANONYMIZE
    );
    expect(withoutExistingEntity.find((rule) => rule.field === 'host.name')?.entityClass).toBe(
      'REDACTED'
    );
  });

  it('applies bulk actions to selected rules only', () => {
    const nextRules = applyBulkFieldAction(
      baseRules,
      ['host.name', 'event.action'],
      FIELD_RULE_ACTION_ANONYMIZE,
      { entityClass: 'MASKED' }
    );

    expect(nextRules.find((rule) => rule.field === 'host.name')?.entityClass).toBe('MASKED');
    expect(nextRules.find((rule) => rule.field === 'event.action')?.entityClass).toBe('MASKED');
    expect(nextRules.find((rule) => rule.field === 'user.email')?.entityClass).toBe('EMAIL');
  });

  it('bulk allow action only affects selected fields', () => {
    const nextRules = applyBulkFieldAction(baseRules, ['user.email'], FIELD_RULE_ACTION_ALLOW);

    expect(nextRules.find((rule) => rule.field === 'user.email')).toEqual({
      field: 'user.email',
      allowed: true,
      anonymized: false,
      entityClass: undefined,
    });
    expect(nextRules.find((rule) => rule.field === 'host.name')).toEqual({
      field: 'host.name',
      allowed: true,
      anonymized: false,
    });
  });
});

describe('rankFieldRules', () => {
  it('prioritizes query relevance and falls back alphabetically', () => {
    const ranked = rankFieldRules(baseRules, { query: 'host' });
    expect(ranked[0].field).toBe('host.name');
  });

  it('matches query case-insensitively with trim and prefers prefix over contains', () => {
    const ranked = rankFieldRules(
      [
        { field: 'user.email', allowed: true, anonymized: false },
        { field: 'my_email_hash', allowed: true, anonymized: false },
      ],
      { query: '  EMAIL ' }
    );

    expect(ranked.map((rule) => rule.field)).toEqual(['user.email', 'my_email_hash']);
  });

  it('applies recent-field boost', () => {
    const ranked = rankFieldRules(baseRules, { query: '', recentFields: ['event.action'] });
    expect(ranked[0].field).toBe('event.action');
  });

  it('can disable ecs boost for empty query ranking', () => {
    const rankedWithBoost = rankFieldRules(
      [
        { field: 'host.name', allowed: true, anonymized: false },
        { field: 'currency', allowed: true, anonymized: false },
      ],
      { query: '', ecsBoost: true }
    );
    const rankedWithoutBoost = rankFieldRules(
      [
        { field: 'host.name', allowed: true, anonymized: false },
        { field: 'currency', allowed: true, anonymized: false },
      ],
      { query: '', ecsBoost: false }
    );

    expect(rankedWithBoost[0].field).toBe('host.name');
    expect(rankedWithoutBoost[0].field).toBe('currency');
  });

  it('applies default ranking heuristics when query is empty', () => {
    const ranked = rankFieldRules(
      [
        { field: 'currency', allowed: true, anonymized: false },
        { field: 'customer_first_name', allowed: true, anonymized: false },
        { field: 'customer_email', allowed: true, anonymized: false },
      ],
      { query: '' }
    );

    expect(ranked.map((rule) => rule.field)).toEqual([
      'customer_email',
      'customer_first_name',
      'currency',
    ]);
  });
});
