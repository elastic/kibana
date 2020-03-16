/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObject, SavedObjectsFindResponse } from 'src/core/server';

import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { IRuleSavedAttributesSavedObjectAttributes } from '../rules/types';
import { ruleStatusSavedObjectType } from '../rules/saved_object_mappings';

interface SignalRuleExceptionParams {
  logger: Logger;
  alertId: string;
  ruleId: string;
  currentStatusSavedObject: SavedObject<IRuleSavedAttributesSavedObjectAttributes>;
  ruleStatusSavedObjects: SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes>;
  message: string;
  services: AlertServices;
  name: string;
}

export const writeSignalRuleExceptionToSavedObject = async ({
  alertId,
  currentStatusSavedObject,
  logger,
  message,
  services,
  ruleStatusSavedObjects,
  ruleId,
  name,
}: SignalRuleExceptionParams): Promise<void> => {
  logger.error(
    `Error from signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}" message: ${message}`
  );
  const sDate = new Date().toISOString();
  currentStatusSavedObject.attributes.status = 'failed';
  currentStatusSavedObject.attributes.statusDate = sDate;
  currentStatusSavedObject.attributes.lastFailureAt = sDate;
  currentStatusSavedObject.attributes.lastFailureMessage = message;
  // current status is failing
  await services.savedObjectsClient.update(ruleStatusSavedObjectType, currentStatusSavedObject.id, {
    ...currentStatusSavedObject.attributes,
  });
  // create new status for historical purposes
  await services.savedObjectsClient.create(ruleStatusSavedObjectType, {
    ...currentStatusSavedObject.attributes,
  });

  if (ruleStatusSavedObjects.saved_objects.length >= 6) {
    // delete fifth status and prepare to insert a newer one.
    const toDelete = ruleStatusSavedObjects.saved_objects.slice(5);
    await toDelete.forEach(async item =>
      services.savedObjectsClient.delete(ruleStatusSavedObjectType, item.id)
    );
  }
};
