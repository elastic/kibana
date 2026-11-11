/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeWithDescription } from '../common';
import { getEditRulePermissions } from './get_edit_rule_permissions';

const ruleTypeWithConsumers = (
  authorizedConsumers: RuleTypeWithDescription['authorizedConsumers']
) => ({ authorizedConsumers } as RuleTypeWithDescription);

describe('getEditRulePermissions', () => {
  const allOnAlerts = ruleTypeWithConsumers({ alerts: { read: true, all: true } });
  const readOnlyOnAlerts = ruleTypeWithConsumers({ alerts: { read: true, all: false } });

  describe('canEditRule', () => {
    test('is true when the user has All privileges on the consumer', () => {
      expect(
        getEditRulePermissions({
          ruleType: allOnAlerts,
          consumer: 'alerts',
          hasActions: false,
          canExecuteActions: false,
        }).canEditRule
      ).toBe(true);
    });

    test('is false when the user only has read privileges on the consumer', () => {
      expect(
        getEditRulePermissions({
          ruleType: readOnlyOnAlerts,
          consumer: 'alerts',
          hasActions: false,
          canExecuteActions: true,
        }).canEditRule
      ).toBe(false);
    });

    test('is false when the consumer is not authorized at all', () => {
      expect(
        getEditRulePermissions({
          ruleType: allOnAlerts,
          consumer: 'siem',
          hasActions: false,
          canExecuteActions: true,
        }).canEditRule
      ).toBe(false);
    });
  });

  describe('canEditActions', () => {
    test.each([
      ['the rule has no actions and the user cannot execute them', false, false, true],
      ['the rule has no actions and the user can execute them', false, true, true],
      ['the rule has actions and the user can execute them', true, true, true],
      ['the rule has actions and the user cannot execute them', true, false, false],
    ])('when %s', (_, hasActions, canExecuteActions, expected) => {
      expect(
        getEditRulePermissions({
          ruleType: allOnAlerts,
          consumer: 'alerts',
          hasActions,
          canExecuteActions,
        }).canEditActions
      ).toBe(expected);
    });
  });

  test('reports both permissions independently', () => {
    expect(
      getEditRulePermissions({
        ruleType: readOnlyOnAlerts,
        consumer: 'alerts',
        hasActions: true,
        canExecuteActions: false,
      })
    ).toEqual({ canEditRule: false, canEditActions: false });
  });
});
