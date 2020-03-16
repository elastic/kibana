/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse, SavedObject } from 'src/core/server';

import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { IRuleSavedAttributesSavedObjectAttributes } from '../rules/types';
import { ruleStatusSavedObjectType } from '../rules/saved_object_mappings';

interface CurrentStatusSavedObjectParams {
  alertId: string;
  services: AlertServices;
  ruleStatusSavedObjects: SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes>;
}

export const getCurrentStatusSavedObject = async ({
  alertId,
  services,
  ruleStatusSavedObjects,
}: CurrentStatusSavedObjectParams): Promise<SavedObject<
  IRuleSavedAttributesSavedObjectAttributes
>> => {
  if (ruleStatusSavedObjects.saved_objects.length === 0) {
    // create
    const date = new Date().toISOString();
    const currentStatusSavedObject = await services.savedObjectsClient.create<
      IRuleSavedAttributesSavedObjectAttributes
    >(ruleStatusSavedObjectType, {
      alertId, // do a search for this id.
      statusDate: date,
      status: 'going to run',
      lastFailureAt: null,
      lastSuccessAt: null,
      lastFailureMessage: null,
      lastSuccessMessage: null,
    });
    return currentStatusSavedObject;
  } else {
    // update 0th to executing.
    const currentStatusSavedObject = ruleStatusSavedObjects.saved_objects[0];
    const sDate = new Date().toISOString();
    currentStatusSavedObject.attributes.status = 'going to run';
    currentStatusSavedObject.attributes.statusDate = sDate;
    await services.savedObjectsClient.update(
      ruleStatusSavedObjectType,
      currentStatusSavedObject.id,
      {
        ...currentStatusSavedObject.attributes,
      }
    );
    return currentStatusSavedObject;
  }
};
