/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types';
import { allowedAppCategories, type AlertDeletionContext } from '../alert_deletion_client';
import { getActiveAlertsQuery, getInactiveAlertsQuery } from '.';

export const previewTask = async (
  context: AlertDeletionContext,
  settings: RulesSettingsAlertDeleteProperties,
  spaceId: string
) => {
  const esClient = await context.elasticsearchClientPromise;

  const {
    isActiveAlertDeleteEnabled,
    isInactiveAlertDeleteEnabled,
    activeAlertDeleteThreshold,
    inactiveAlertDeleteThreshold,
    categoryIds,
  } = settings;

  if (categoryIds && categoryIds.length > 0) {
    if (categoryIds.some((category) => !allowedAppCategories.includes(category))) {
      throw new Error(`Invalid category id - ${categoryIds}`);
    }
  }

  const ruleTypes = context.ruleTypeRegistry.getAllTypesForCategories(categoryIds);
  const indices = context.getAlertIndicesAlias(ruleTypes, spaceId);

  let numAlertsToBeDeleted = 0;

  if (isActiveAlertDeleteEnabled) {
    const activeAlertsQuery = getActiveAlertsQuery(activeAlertDeleteThreshold, spaceId);

    try {
      const countResponse = await esClient.count({
        index: indices,
        query: activeAlertsQuery,
        allow_no_indices: true,
        ignore_unavailable: true,
      });
      numAlertsToBeDeleted += countResponse.count;
    } catch (err) {
      context.logger.error(
        `Error determining the number of active alerts to delete: ${err.message}`
      );
      throw err;
    }
  }

  if (isInactiveAlertDeleteEnabled) {
    const inactiveAlertsQuery = getInactiveAlertsQuery(inactiveAlertDeleteThreshold, spaceId);

    try {
      const countResponse = await esClient.count({
        index: indices,
        query: inactiveAlertsQuery,
        allow_no_indices: true,
        ignore_unavailable: true,
      });
      numAlertsToBeDeleted += countResponse.count;
    } catch (err) {
      context.logger.error(
        `Error determining the number of inactive alerts to delete: ${err.message}`
      );
      throw err;
    }
  }

  return numAlertsToBeDeleted;
};
