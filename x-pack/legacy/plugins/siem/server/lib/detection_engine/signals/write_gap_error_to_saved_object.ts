/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Logger, SavedObject, SavedObjectsFindResponse } from 'src/core/server';

import { AlertServices } from '../../../../../../../plugins/alerting/server';
import { IRuleSavedAttributesSavedObjectAttributes } from '../rules/types';
import { ruleStatusSavedObjectType } from '../rules/saved_object_mappings';

interface WriteGapErrorToSavedObjectParams {
  logger: Logger;
  alertId: string;
  ruleId: string;
  currentStatusSavedObject: SavedObject<IRuleSavedAttributesSavedObjectAttributes>;
  ruleStatusSavedObjects: SavedObjectsFindResponse<IRuleSavedAttributesSavedObjectAttributes>;
  services: AlertServices;
  gap: moment.Duration | null | undefined;
  name: string;
}

export const writeGapErrorToSavedObject = async ({
  alertId,
  currentStatusSavedObject,
  logger,
  services,
  ruleStatusSavedObjects,
  ruleId,
  gap,
  name,
}: WriteGapErrorToSavedObjectParams) => {
  if (gap != null && gap.asMilliseconds() > 0) {
    logger.warn(
      `Signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}" has a time gap of ${gap.humanize()} (${gap.asMilliseconds()}ms), and could be missing signals within that time. Consider increasing your look behind time or adding more Kibana instances.`
    );
    // write a failure status whenever we have a time gap
    // this is a temporary solution until general activity
    // monitoring is developed as a feature
    const gapDate = new Date().toISOString();
    await services.savedObjectsClient.create(ruleStatusSavedObjectType, {
      alertId,
      statusDate: gapDate,
      status: 'failed',
      lastFailureAt: gapDate,
      lastSuccessAt: currentStatusSavedObject.attributes.lastSuccessAt,
      lastFailureMessage: `Signal rule name: "${name}", id: "${alertId}", rule_id: "${ruleId}" has a time gap of ${gap.humanize()} (${gap.asMilliseconds()}ms), and could be missing signals within that time. Consider increasing your look behind time or adding more Kibana instances.`,
      lastSuccessMessage: currentStatusSavedObject.attributes.lastSuccessMessage,
    });

    if (ruleStatusSavedObjects.saved_objects.length >= 6) {
      // delete fifth status and prepare to insert a newer one.
      const toDelete = ruleStatusSavedObjects.saved_objects.slice(5);
      await toDelete.forEach(async item =>
        services.savedObjectsClient.delete(ruleStatusSavedObjectType, item.id)
      );
    }
  }
};
