/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import type { SavedObjectsGetOptions } from '@kbn/core-saved-objects-api-server';
import type { RawRuleTemplate } from '../../../types';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../../saved_objects';

export interface GetRuleTemplateSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  id: string;
  savedObjectsGetOptions?: SavedObjectsGetOptions;
}

export const getRuleTemplateSo = (
  params: GetRuleTemplateSoParams
): Promise<SavedObject<RawRuleTemplate>> => {
  const { savedObjectsClient, id, savedObjectsGetOptions } = params;

  return savedObjectsClient.get<RawRuleTemplate>(
    RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    id,
    savedObjectsGetOptions
  );
};
