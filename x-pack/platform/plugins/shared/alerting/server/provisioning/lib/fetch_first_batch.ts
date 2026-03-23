/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KueryNode } from '@kbn/es-query';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-shared';
import type { RawRule } from '../../types';
import { GET_RULES_BATCH_SIZE } from '../constants';

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
