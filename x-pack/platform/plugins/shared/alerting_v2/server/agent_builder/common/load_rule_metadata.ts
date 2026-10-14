/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '../../lib/rules_client';
import type { LoggerServiceContract } from '../../lib/services/logger_service/logger_service';

export interface RuleMetadata {
  ruleName?: string;
  groupingFields?: string[];
}

export const loadRuleMetadata = async (
  rulesClient: RulesClient,
  ruleId: string,
  logger: LoggerServiceContract
): Promise<RuleMetadata> => {
  try {
    const rule = await rulesClient.getRule({ id: ruleId });
    return {
      ruleName: rule.metadata.name,
      groupingFields: rule.grouping?.fields,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.debug({
      message: `Failed to load rule metadata for episode label; falling back to rule id: ${reason}`,
      labels: { rule_id: ruleId },
    });
    return {};
  }
};
