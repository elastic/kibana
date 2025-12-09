/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsSearchOptions,
  SavedObjectsSearchResponse,
} from '@kbn/core-saved-objects-api-server';
import type { RawRule } from '../../../saved_objects/schemas/raw_rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../..';

export interface SearchRulesSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsSearchOptions: Omit<SavedObjectsSearchOptions, 'type'>;
}

type RawRuleWithType = RawRule & { type: typeof RULE_SAVED_OBJECT_TYPE };

export const searchRulesSo = <RuleAggregation = Record<string, unknown>>(
  params: SearchRulesSoParams
): Promise<SavedObjectsSearchResponse<RawRuleWithType, RuleAggregation>> => {
  const { savedObjectsClient, savedObjectsSearchOptions } = params;

  return savedObjectsClient.search<RawRuleWithType, RuleAggregation>({
    ...savedObjectsSearchOptions,
    type: RULE_SAVED_OBJECT_TYPE,
  });
};
