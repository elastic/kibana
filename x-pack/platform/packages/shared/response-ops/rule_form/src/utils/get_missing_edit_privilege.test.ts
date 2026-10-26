/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleTypeWithDescription } from '../common';
import { getMissingEditPrivilege } from './get_missing_edit_privilege';

const ruleTypeWithConsumers = (
  authorizedConsumers: RuleTypeWithDescription['authorizedConsumers']
) => ({ authorizedConsumers } as RuleTypeWithDescription);

describe('getMissingEditPrivilege', () => {
  const allOnAlerts = ruleTypeWithConsumers({ alerts: { read: true, all: true } });
  const readOnlyOnAlerts = ruleTypeWithConsumers({ alerts: { read: true, all: false } });

  test('returns undefined when the user has All privileges and the rule has no actions', () => {
    expect(
      getMissingEditPrivilege({
        ruleType: allOnAlerts,
        consumer: 'alerts',
        hasActions: false,
        canExecuteActions: false,
      })
    ).toBeUndefined();
  });

  test('returns undefined when the user has All privileges and can execute actions', () => {
    expect(
      getMissingEditPrivilege({
        ruleType: allOnAlerts,
        consumer: 'alerts',
        hasActions: true,
        canExecuteActions: true,
      })
    ).toBeUndefined();
  });

  test('returns rule when the user only has read privileges on the consumer', () => {
    expect(
      getMissingEditPrivilege({
        ruleType: readOnlyOnAlerts,
        consumer: 'alerts',
        hasActions: false,
        canExecuteActions: true,
      })
    ).toBe('rule');
  });

  test('returns rule when the consumer is not authorized at all', () => {
    expect(
      getMissingEditPrivilege({
        ruleType: allOnAlerts,
        consumer: 'siem',
        hasActions: false,
        canExecuteActions: true,
      })
    ).toBe('rule');
  });

  test('returns actions when the rule has actions and the user cannot execute them', () => {
    expect(
      getMissingEditPrivilege({
        ruleType: allOnAlerts,
        consumer: 'alerts',
        hasActions: true,
        canExecuteActions: false,
      })
    ).toBe('actions');
  });

  test('returns rule when the user is missing both privileges', () => {
    expect(
      getMissingEditPrivilege({
        ruleType: readOnlyOnAlerts,
        consumer: 'alerts',
        hasActions: true,
        canExecuteActions: false,
      })
    ).toBe('rule');
  });
});
