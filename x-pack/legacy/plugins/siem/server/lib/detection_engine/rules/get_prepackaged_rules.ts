/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PrepackagedRules } from '../types';
import { addPrepackagedRulesSchema } from '../routes/schemas/add_prepackaged_rules_schema';
import { rawRules } from './prepackaged_rules';

/**
 * Validate the rules from the file system and throw any errors indicating to the developer
 * that they are adding incorrect schema rules. Also this will auto-flush in all the default
 * aspects such as default interval of 5 minutes, default arrays, etc...
 */
export const validateAllPrepackagedRules = (rules: PrepackagedRules[]): PrepackagedRules[] => {
  return rules.map(rule => {
    const validatedRule = addPrepackagedRulesSchema.validate(rule);
    if (validatedRule.error != null) {
      const ruleName = rule.name ? rule.name : '(rule name unknown)';
      const ruleId = rule.rule_id ? rule.rule_id : '(rule rule_id unknown)';
      throw new TypeError(
        `name: "${ruleName}", rule_id: "${ruleId}" within the folder rules/prepackaged_rules ` +
          `is not a valid detection engine rule. Expect the system ` +
          `to not work with pre-packaged rules until this rule is fixed ` +
          `or the file is removed. Error is: ${
            validatedRule.error.message
          }, Full rule contents are:\n${JSON.stringify(rule, null, 2)}`
      );
    } else {
      return validatedRule.value;
    }
  });
};

export const getPrepackagedRules = (rules = rawRules): PrepackagedRules[] => {
  return validateAllPrepackagedRules(rules);
};
