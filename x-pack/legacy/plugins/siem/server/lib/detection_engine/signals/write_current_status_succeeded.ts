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
}

export const writeCurrentStatusSucceeded = async ({
  services,
  currentStatusSavedObject,
}: GetRuleStatusSavedObject): Promise<void> => {
  const sDate = new Date().toISOString();
  currentStatusSavedObject.attributes.status = 'succeeded';
  currentStatusSavedObject.attributes.statusDate = sDate;
  currentStatusSavedObject.attributes.lastSuccessAt = sDate;
  currentStatusSavedObject.attributes.lastSuccessMessage = 'succeeded';
  await services.savedObjectsClient.update(ruleStatusSavedObjectType, currentStatusSavedObject.id, {
    ...currentStatusSavedObject.attributes,
  });
};
