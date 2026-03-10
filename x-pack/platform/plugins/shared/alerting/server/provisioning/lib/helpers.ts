/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { RawRule } from '../../types';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import {
  UiamApiKeyProvisioningStatus,
  UiamApiKeyProvisioningEntityType,
} from '../../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import type { ApiKeyToConvert, ProvisioningStatusDocs } from '../types';

export const GET_RULES_BATCH_SIZE = 300;

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

export interface FetchFirstBatchOptions {
  excludeRulesFilter?: KueryNode;
  perPage?: number;
  ruleType: string;
}

/**
 * Opens a PIT finder for rules, fetches the first batch, closes the finder.
 * Returns the rules and whether more batches exist.
 */
export const fetchFirstBatchOfRulesToConvert = async (
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient,
  options: FetchFirstBatchOptions
): Promise<{ rules: RuleForClassification[]; hasMore: boolean }> => {
  const { excludeRulesFilter, ruleType } = options;
  const perPage = options.perPage ?? GET_RULES_BATCH_SIZE;
  const rulesFinder =
    await encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>({
      type: ruleType,
      perPage,
      namespaces: ['*'],
      ...(excludeRulesFilter ? { filter: excludeRulesFilter } : {}),
    });
  try {
    const findIterator = rulesFinder.find();
    const firstBatch = await findIterator.next();
    if (firstBatch.done || !firstBatch.value?.saved_objects) {
      return { rules: [], hasMore: false };
    }
    const response = firstBatch.value;
    const hasMore = response.total > response.saved_objects.length;
    const rules: RuleForClassification[] = response.saved_objects.map((so) => ({
      id: so.id,
      attributes: so.attributes,
      version: so.version,
    }));
    return { rules, hasMore };
  } finally {
    await rulesFinder.close();
  }
};

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
