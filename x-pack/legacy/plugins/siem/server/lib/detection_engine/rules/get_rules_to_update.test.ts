/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRulesToUpdate } from './get_rules_to_update';
import { getResult, fullRuleAlertParamsRest } from '../routes/__mocks__/request_responses';

describe('get_rules_to_update', () => {
  test('should return empty array if both rule sets are empty', () => {
    const update = getRulesToUpdate([], []);
    expect(update).toEqual([]);
  });

  test('should return empty array if the id of the two rules do not match', () => {
    const ruleFromFileSystem = fullRuleAlertParamsRest();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 2;

    const installedRule = getResult();
    installedRule.params.ruleId = 'rule-2';
    installedRule.params.version = 1;
    const update = getRulesToUpdate([ruleFromFileSystem], [installedRule]);
    expect(update).toEqual([]);
  });

  test('should return empty array if the id of file system rule is less than the installed version', () => {
    const ruleFromFileSystem = fullRuleAlertParamsRest();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 1;

    const installedRule = getResult();
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 2;
    const update = getRulesToUpdate([ruleFromFileSystem], [installedRule]);
    expect(update).toEqual([]);
  });

  test('should return empty array if the id of file system rule is the same as the installed version', () => {
    const ruleFromFileSystem = fullRuleAlertParamsRest();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 1;

    const installedRule = getResult();
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    const update = getRulesToUpdate([ruleFromFileSystem], [installedRule]);
    expect(update).toEqual([]);
  });

  test('should return the rule to update if the id of file system rule is greater than the installed version', () => {
    const ruleFromFileSystem = fullRuleAlertParamsRest();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 2;

    const installedRule = getResult();
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    const update = getRulesToUpdate([ruleFromFileSystem], [installedRule]);
    expect(update).toEqual([ruleFromFileSystem]);
  });

  test('should return 1 rule out of 2 to update if the id of file system rule is greater than the installed version of just one', () => {
    const ruleFromFileSystem = fullRuleAlertParamsRest();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 2;

    const installedRule1 = getResult();
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;

    const installedRule2 = getResult();
    installedRule2.params.ruleId = 'rule-2';
    installedRule2.params.version = 1;

    const update = getRulesToUpdate([ruleFromFileSystem], [installedRule1, installedRule2]);
    expect(update).toEqual([ruleFromFileSystem]);
  });

  test('should return 2 rules out of 2 to update if the id of file system rule is greater than the installed version of both', () => {
    const ruleFromFileSystem1 = fullRuleAlertParamsRest();
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const ruleFromFileSystem2 = fullRuleAlertParamsRest();
    ruleFromFileSystem2.rule_id = 'rule-2';
    ruleFromFileSystem2.version = 2;

    const installedRule1 = getResult();
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;

    const installedRule2 = getResult();
    installedRule2.params.ruleId = 'rule-2';
    installedRule2.params.version = 1;

    const update = getRulesToUpdate(
      [ruleFromFileSystem1, ruleFromFileSystem2],
      [installedRule1, installedRule2]
    );
    expect(update).toEqual([ruleFromFileSystem1, ruleFromFileSystem2]);
  });
});
