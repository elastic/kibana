/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RawRuleTemplate } from '../../../types';

export interface FindRuleTemplatesSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsFindOptions: Omit<SavedObjectsFindOptions, 'type'>;
}

export const findRuleTemplatesSo = (
  params: FindRuleTemplatesSoParams
): Promise<SavedObjectsFindResponse<RawRuleTemplate>> => {
  const { savedObjectsClient, savedObjectsFindOptions } = params;

  return savedObjectsClient.find<RawRuleTemplate>({
    ...savedObjectsFindOptions,
    type: RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  });
};
