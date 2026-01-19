/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  SavedObjectsBulkResponse,
  SavedObjectsGetOptions,
} from '@kbn/core-saved-objects-api-server';
import type { RawRule } from '../../../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';

export interface BulkGetRulesSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  ids: string[];
  savedObjectsGetOptions?: SavedObjectsGetOptions;
}

export const bulkGetRulesSo = (
  params: BulkGetRulesSoParams
): Promise<SavedObjectsBulkResponse<RawRule>> => {
  const { savedObjectsClient, ids, savedObjectsGetOptions } = params;

  return savedObjectsClient.bulkGet<RawRule>(
    ids.map((id) => ({ type: RULE_SAVED_OBJECT_TYPE, id })),
    savedObjectsGetOptions
  );
};
