/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawRule } from '../../types';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import {
  UiamApiKeyProvisioningStatus,
  UiamApiKeyProvisioningEntityType,
} from '../../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import type { ApiKeyToConvert, ProvisioningStatusDocs } from '../types';

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Builds a provisioning status doc for a rule that was skipped (no API key, already has UIAM key, or user-created key).
 */
export const createSkippedRuleStatus = (
  ruleId: string,
  message: string
): ProvisioningStatusDocs => ({
  type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  id: ruleId,
  attributes: {
    '@timestamp': new Date().toISOString(),
    entityId: ruleId,
    entityType: UiamApiKeyProvisioningEntityType.RULE,
    status: UiamApiKeyProvisioningStatus.SKIPPED,
    message,
  },
});

/**
 * Builds a provisioning status doc for a rule whose UIAM API key conversion failed.
 */
export const createFailedConversionStatus = (
  ruleId: string,
  message: string
): ProvisioningStatusDocs => ({
  type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  id: ruleId,
  attributes: {
    '@timestamp': new Date().toISOString(),
    entityId: ruleId,
    entityType: UiamApiKeyProvisioningEntityType.RULE,
    status: UiamApiKeyProvisioningStatus.FAILED,
    message,
  },
});

/**
 * Result item from a bulkUpdate call (has id and optional error).
 */
export interface BulkUpdateResultItem {
  id: string;
  error?: { message?: string };
}

/**
 * Builds a provisioning status doc from a single saved object result of a bulk rule update.
 */
export const createStatusFromBulkUpdateResult = (
  so: BulkUpdateResultItem
): ProvisioningStatusDocs => ({
  type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
  id: so.id,
  attributes: {
    '@timestamp': new Date().toISOString(),
    entityId: so.id,
    entityType: UiamApiKeyProvisioningEntityType.RULE,
    status: so.error ? UiamApiKeyProvisioningStatus.FAILED : UiamApiKeyProvisioningStatus.COMPLETED,
    ...(so.error
      ? {
          message: `Error bulk updating the rule with ID ${so.id}: ${so.error.message ?? so.error}`,
        }
      : {}),
  },
});

export interface RuleForClassification {
  id: string;
  attributes: RawRule;
  version?: string;
}

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
    },
  };
};
