/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/server';
import { ruleStatusSavedObjectType } from '../rules/saved_object_mappings';

import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { IRuleSavedAttributesSavedObjectAttributes } from '../rules/types';

interface GetRuleStatusSavedObject {
  services: AlertServices;
  currentStatusSavedObject: SavedObject<IRuleSavedAttributesSavedObjectAttributes>;
  lastLookBackDate: string | null | undefined;
  bulkCreateTimes: string[] | null | undefined;
  searchAfterTimes: string[] | null | undefined;
}

export const writeCurrentStatusSucceeded = async ({
  services,
  currentStatusSavedObject,
  lastLookBackDate,
  bulkCreateTimes,
  searchAfterTimes,
}: GetRuleStatusSavedObject): Promise<void> => {
  const sDate = new Date().toISOString();
  currentStatusSavedObject.attributes.status = 'succeeded';
  currentStatusSavedObject.attributes.statusDate = sDate;
  currentStatusSavedObject.attributes.lastSuccessAt = sDate;
  currentStatusSavedObject.attributes.lastSuccessMessage = 'succeeded';
  if (lastLookBackDate) {
    currentStatusSavedObject.attributes.lastLookBackDate = lastLookBackDate;
  }
  if (bulkCreateTimes) {
    currentStatusSavedObject.attributes.bulkCreateTimeDurations = bulkCreateTimes;
  }
  if (searchAfterTimes) {
    currentStatusSavedObject.attributes.searchAfterTimeDurations = searchAfterTimes;
  }
  await services.savedObjectsClient.update(ruleStatusSavedObjectType, currentStatusSavedObject.id, {
    ...currentStatusSavedObject.attributes,
  });
};
