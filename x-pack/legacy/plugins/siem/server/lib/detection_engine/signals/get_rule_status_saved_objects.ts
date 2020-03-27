/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse, SavedObjectsClientContract } from 'kibana/server';
import { IRuleStatusAttributes } from '../rules/types';
import { MAX_RULE_STATUSES } from './rule_status_service';
import { ruleStatusSavedObjectClientFactory } from './rule_status_saved_object_client';

interface GetRuleStatusSavedObject {
  alertId: string;
  savedObjectsClient: SavedObjectsClientContract;
}

export const getRuleStatusSavedObjects = async ({
  alertId,
  savedObjectsClient,
}: GetRuleStatusSavedObject): Promise<SavedObjectsFindResponse<IRuleStatusAttributes>> => {
  const ruleStatusClient = ruleStatusSavedObjectClientFactory(savedObjectsClient);
  return ruleStatusClient.find({
    perPage: MAX_RULE_STATUSES,
    sortField: 'statusDate',
    sortOrder: 'desc',
    search: `${alertId}`,
    searchFields: ['alertId'],
  });
};
