/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsBulkUpdateResponse,
} from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RawRule } from '../../../types';

export interface BulkUpdateRuleSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  rules: Array<{ id: string; attributes: Partial<RawRule> }>;
  options?: SavedObjectsBulkUpdateOptions;
}

export const bulkUpdateRuleSo = (
  params: BulkUpdateRuleSoParams
): Promise<SavedObjectsBulkUpdateResponse<RawRule>> => {
  const rulesToUpdate = params.rules.map((rule) => ({
    type: RULE_SAVED_OBJECT_TYPE,
    id: rule.id,
    attributes: rule.attributes,
  }));

  return params.savedObjectsClient.bulkUpdate<RawRule>(rulesToUpdate, params.options);
};
