/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse } from 'kibana/server';
import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { ruleStatusSavedObjectType } from '../rules/saved_object_mappings';
import { IRuleSavedAttributesSavedObjectAttributes } from '../rules/types';

interface GetRuleStatusSavedObject {
  alertId: string;
  services: AlertServices;
}

export const getRuleStatusSavedObjects = async ({
  alertId,
  services,
}: GetRuleStatusSavedObject): Promise<SavedObjectsFindResponse<
  IRuleSavedAttributesSavedObjectAttributes
>> => {
  return services.savedObjectsClient.find<IRuleSavedAttributesSavedObjectAttributes>({
    type: ruleStatusSavedObjectType,
    perPage: 6, // 0th element is current status, 1-5 is last 5 failures.
    sortField: 'statusDate',
    sortOrder: 'desc',
    search: `${alertId}`,
    searchFields: ['alertId'],
  });
};
