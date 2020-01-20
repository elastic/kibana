/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrepackagedRules } from '../types';
import { RuleAlertType } from './types';

export const getRulesToUpdate = (
  rulesFromFileSystem: PrepackagedRules[],
  installedRules: RuleAlertType[]
): PrepackagedRules[] => {
  return rulesFromFileSystem.filter(rule =>
    installedRules.some(installedRule => {
      return (
        rule.rule_id === installedRule.params.ruleId && rule.version > installedRule.params.version
      );
    })
  );
};
