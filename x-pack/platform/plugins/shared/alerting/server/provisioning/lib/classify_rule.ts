/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiKeyToConvert, ProvisioningStatusDocs } from '../types';
import type { RuleForClassification } from './fetch_first_batch';
import { createSkippedRuleStatus } from './provisioning_status';

export type ClassifyRuleResult =
  | { action: 'skip'; status: ProvisioningStatusDocs }
  | { action: 'convert'; rule: ApiKeyToConvert };

/**
 * Classifies a rule as either skip (with status doc) or convert (with rule payload).
 * Skip: no API key, already has UIAM key, or user-created key.
 * Convert: system-generated API key and no UIAM key yet.
 */
export const classifyRuleForUiamProvisioning = (
  rule: RuleForClassification
): ClassifyRuleResult => {
  const { id } = rule;
  const { apiKey, apiKeyCreatedByUser, uiamApiKey } = rule.attributes;

  if (!apiKey) {
    return { action: 'skip', status: createSkippedRuleStatus(id, 'The rule has no API key') };
  }
  if (uiamApiKey) {
    return {
      action: 'skip',
      status: createSkippedRuleStatus(id, 'The rule already has a UIAM API key'),
    };
  }
  if (apiKeyCreatedByUser === true) {
    return {
      action: 'skip',
      status: createSkippedRuleStatus(id, 'The API key was created by the user'),
    };
  }
  return {
    action: 'convert',
    rule: {
      ruleId: id,
      attributes: rule.attributes,
      version: rule.version,
      namespace: rule.namespace,
    },
  };
};

export interface ClassifyRulesResult {
  provisioningStatusForSkippedRules: Array<ProvisioningStatusDocs>;
  apiKeysToConvert: Array<ApiKeyToConvert>;
}

/**
 * Classifies a batch of rules into skipped (with status docs) and to-convert (rule payloads).
 */
export const classifyRulesForUiamProvisioning = (
  rules: Array<RuleForClassification>
): ClassifyRulesResult => {
  const provisioningStatusForSkippedRules: Array<ProvisioningStatusDocs> = [];
  const apiKeysToConvert: Array<ApiKeyToConvert> = [];
  for (const rule of rules) {
    const result = classifyRuleForUiamProvisioning(rule);
    if (result.action === 'skip') {
      provisioningStatusForSkippedRules.push(result.status);
    } else {
      apiKeysToConvert.push(result.rule);
    }
  }
  return { provisioningStatusForSkippedRules, apiKeysToConvert };
};
