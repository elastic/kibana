/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '../../lib/rules_client';

export interface RuleMetadata {
  ruleName?: string;
  groupingFields?: string[];
}

export const loadRuleMetadata = async (
  rulesClient: RulesClient,
  ruleId: string
): Promise<RuleMetadata> => {
  try {
    const rule = await rulesClient.getRule({ id: ruleId });
    return {
      ruleName: rule.metadata.name,
      groupingFields: rule.grouping?.fields,
    };
  } catch {
    return {};
  }
};
