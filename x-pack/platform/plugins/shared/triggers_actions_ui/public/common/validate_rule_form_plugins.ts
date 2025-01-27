/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleFormProps } from '@kbn/response-ops-rule-form';

const requiredPluginNames = [
  // dataViews is intentionally omitted from this list because it is not required for all rule types
  'http',
  'i18n',
  'theme',
  'userProfile',
  'application',
  'notifications',
  'charts',
  'settings',
  'data',
  'unifiedSearch',
  'docLinks',
];

type RequiredRuleFormPlugins = Omit<
  RuleFormProps['plugins'],
  'actionTypeRegistry' | 'ruleTypeRegistry'
>;
export const validateRuleFormPlugins = (input: unknown): RequiredRuleFormPlugins => {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Failed to validate Rule Form Plugins: not an object');
  }

  requiredPluginNames.forEach((pluginName) => {
    if (!(pluginName in input)) {
      throw new Error(`Failed to validate Rule Form Plugins: missing plugin ${pluginName}`);
    }
  });

  return input as RequiredRuleFormPlugins;
};
