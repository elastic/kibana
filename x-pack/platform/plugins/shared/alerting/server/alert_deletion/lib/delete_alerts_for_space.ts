/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSettingsAlertDeleteProperties } from '@kbn/alerting-types';
import { omitBy } from 'lodash';
import { allowedAppCategories, type AlertDeletionContext } from '../alert_deletion_client';
import { deleteAlertsForQuery, getActiveAlertsQuery, getInactiveAlertsQuery } from '.';

export const deleteAlertsForSpace = async (
  context: AlertDeletionContext,
  settings: RulesSettingsAlertDeleteProperties,
  spaceId: string,
  abortController: AbortController
): Promise<{ numAlertsDeleted: number; errors?: string[] }> => {
  const taskManager = await context.taskManagerStartPromise;

  const {
    isActiveAlertDeleteEnabled,
    isInactiveAlertDeleteEnabled,
    activeAlertDeleteThreshold,
    inactiveAlertDeleteThreshold,
    categoryIds,
  } = settings;

  if (categoryIds && categoryIds.length > 0) {
    if (categoryIds.some((category) => !allowedAppCategories.includes(category))) {
      return {
        numAlertsDeleted: 0,
        errors: [`Invalid category ID found - ${categoryIds} - not deleting alerts`],
      };
    }
  }

  const ruleTypes =
    categoryIds && categoryIds.length > 0
      ? context.ruleTypeRegistry.getAllTypesForCategories(categoryIds)
      : context.ruleTypeRegistry.getAllTypes();
  const indices = context.getAlertIndicesAlias(ruleTypes, spaceId);

  let numAlertsDeleted = 0;
  const errors = [];

  if (indices.length === 0) {
    context.logger.warn(`No indices found for rules settings ${settings}. No alerts deleted`);
    return { numAlertsDeleted, errors: [`No indices found`] };
  }

  if (isActiveAlertDeleteEnabled) {
    const activeAlertsQuery = getActiveAlertsQuery(activeAlertDeleteThreshold, spaceId);

    try {
      const {
        numAlertsDeleted: numActiveAlertsDeleted,
        taskIds,
        alertUuidsToClear,
        errors: activeAlertDeletionErrors,
      } = await deleteAlertsForQuery(context, indices, activeAlertsQuery, abortController);

      numAlertsDeleted += numActiveAlertsDeleted;
      errors.push(...activeAlertDeletionErrors);

      await taskManager.bulkUpdateState(Array.from(taskIds), (state) => {
        try {
          const updatedAlertInstances = omitBy(state.alertInstances, ({ meta: { uuid } }) =>
            alertUuidsToClear.includes(uuid)
          );
          return {
            ...state,
            alertInstances: updatedAlertInstances,
          };
        } catch (err) {
          return state;
        }
      });
    } catch (err) {
      const errMessage = `Error deleting active alerts: ${err.message}`;
      context.logger.error(errMessage, { error: { stack_trace: err.stack } });
      errors.push(errMessage);
    }
  }

  if (isInactiveAlertDeleteEnabled) {
    const inactiveAlertsQuery = getInactiveAlertsQuery(inactiveAlertDeleteThreshold, spaceId);

    try {
      const { numAlertsDeleted: numInactiveAlertsDeleted, errors: inactiveAlertDeletionErrors } =
        await deleteAlertsForQuery(context, indices, inactiveAlertsQuery, abortController);
      numAlertsDeleted += numInactiveAlertsDeleted;
      errors.push(...inactiveAlertDeletionErrors);
    } catch (err) {
      const errMessage = `Error deleting inactive alerts: ${err.message}`;
      context.logger.error(errMessage, { error: { stack_trace: err.stack } });
      errors.push(errMessage);
    }
  }

  return { numAlertsDeleted, ...(errors.length > 0 ? { errors } : {}) };
};
