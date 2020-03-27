/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse, SavedObject, SavedObjectsClientContract } from 'src/core/server';

import { IRuleStatusAttributes } from '../rules/types';
import { ruleStatusSavedObjectClientFactory } from './rule_status_saved_object_client';

interface CurrentStatusSavedObjectParams {
  alertId: string;
  savedObjectsClient: SavedObjectsClientContract;
  ruleStatuses: SavedObjectsFindResponse<IRuleStatusAttributes>;
}

export const getCurrentStatusSavedObject = async ({
  alertId,
  savedObjectsClient,
  ruleStatuses,
}: CurrentStatusSavedObjectParams): Promise<SavedObject<IRuleStatusAttributes>> => {
  const [currentStatus] = ruleStatuses.saved_objects;
  if (currentStatus) {
    return currentStatus;
  }

  const ruleStatusClient = ruleStatusSavedObjectClientFactory(savedObjectsClient);
  const now = new Date().toISOString();
  const newStatus = await ruleStatusClient.create({
    alertId,
    statusDate: now,
    status: 'going to run',
    lastFailureAt: null,
    lastSuccessAt: null,
    lastFailureMessage: null,
    lastSuccessMessage: null,
    gap: null,
    bulkCreateTimeDurations: [],
    searchAfterTimeDurations: [],
    lastLookBackDate: null,
  });

  return newStatus;
};
