/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAlert, createRule } from '../fixtures/test_utils';
import { RuleCatalog } from './rule_catalog';

describe('RuleCatalog', () => {
  const catalog = RuleCatalog.of(
    new Map([['rule-1', createRule({ id: 'rule-1', spaceId: 'space-a' })]])
  );

  it('resolves rules by id and by alert', () => {
    expect(catalog.get('rule-1')?.id).toBe('rule-1');
    expect(catalog.get('missing')).toBeUndefined();
    expect(catalog.forAlert(createAlert({ rule_id: 'rule-1' }))?.id).toBe('rule-1');
    expect(catalog.forAlert(createAlert({ rule_id: null }))).toBeUndefined();
  });

  it('resolves the rule space id', () => {
    expect(catalog.spaceIdOf('rule-1')).toBe('space-a');
    expect(catalog.spaceIdOf('missing')).toBeUndefined();
  });

  describe('isOrphanedInternalAlert', () => {
    it('is true for an internal alert whose rule is absent', () => {
      expect(catalog.isOrphanedInternalAlert(createAlert({ rule_id: 'deleted' }))).toBe(true);
    });

    it('is false for an internal alert whose rule exists', () => {
      expect(catalog.isOrphanedInternalAlert(createAlert({ rule_id: 'rule-1' }))).toBe(false);
    });

    it('is false for an external alert (null rule_id)', () => {
      expect(
        catalog.isOrphanedInternalAlert(createAlert({ rule_id: null, source: 'pagerduty' }))
      ).toBe(false);
    });
  });
});
