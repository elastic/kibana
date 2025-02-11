/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { RawRule } from '../../../types';

export interface FindRulesSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsFindOptions: Omit<SavedObjectsFindOptions, 'type'>;
}

export const findRulesSo = <RuleAggregation = Record<string, unknown>>(
  params: FindRulesSoParams
): Promise<SavedObjectsFindResponse<RawRule, RuleAggregation>> => {
  const { savedObjectsClient, savedObjectsFindOptions } = params;

  return savedObjectsClient.find<RawRule, RuleAggregation>({
    ...savedObjectsFindOptions,
    type: RULE_SAVED_OBJECT_TYPE,
  });
};
