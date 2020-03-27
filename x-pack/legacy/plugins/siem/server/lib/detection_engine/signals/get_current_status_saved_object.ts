/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse, SavedObject } from 'src/core/server';

import { IRuleStatusAttributes } from '../rules/types';
import { RuleStatusSavedObjectsClient } from './rule_status_saved_objects_client';

interface CurrentStatusSavedObjectParams {
  alertId: string;
  ruleStatuses: SavedObjectsFindResponse<IRuleStatusAttributes>;
  ruleStatusClient: RuleStatusSavedObjectsClient;
}

export const getCurrentStatusSavedObject = async ({
  alertId,
  ruleStatusClient,
  ruleStatuses,
}: CurrentStatusSavedObjectParams): Promise<SavedObject<IRuleStatusAttributes>> => {
  const [currentStatus] = ruleStatuses.saved_objects;
  if (currentStatus) {
    return currentStatus;
  }

  const now = new Date().toISOString();
  return ruleStatusClient.create({
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
};
