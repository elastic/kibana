/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_UUID } from '@kbn/rule-data-utils';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { GetSummarizedAlertsParams, IAlertsClient } from '../../../alerts_client/types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  CombinedSummarizedAlerts,
  RuleAlertData,
} from '../../../types';

interface GetSummarizedAlertsOpts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
> {
  alertsClient: IAlertsClient<AlertData, State, Context, ActionGroupIds, RecoveryActionGroupId>;
  queryOptions: GetSummarizedAlertsParams;
}

export const getSummarizedAlerts = async <
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string,
  AlertData extends RuleAlertData
>({
  alertsClient,
  queryOptions,
}: GetSummarizedAlertsOpts<
  State,
  Context,
  ActionGroupIds,
  RecoveryActionGroupId,
  AlertData
>): Promise<CombinedSummarizedAlerts> => {
  let alerts;
  try {
    alerts = await alertsClient.getSummarizedAlerts!(queryOptions);
  } catch (e) {
    throw createTaskRunError(e, TaskErrorSource.FRAMEWORK);
  }

  /**
   * We need to remove all new alerts with maintenance windows retrieved from
   * getSummarizedAlerts because they might not have maintenance window IDs
   * associated with them from maintenance windows with scoped query updated
   * yet (the update call uses refresh: false). So we need to rely on the in
   * memory alerts to do this.
   */
  const newAlertsInMemory = Object.values(alertsClient.getProcessedAlerts('new'));

  const newAlertsWithMaintenanceWindowIds = newAlertsInMemory.reduce<string[]>((result, alert) => {
    if (alert.getMaintenanceWindowIds().length > 0) {
      result.push(alert.getUuid());
    }
    return result;
  }, []);

  const newAlerts = alerts.new.data.filter((alert) => {
    return !newAlertsWithMaintenanceWindowIds.includes(alert[ALERT_UUID]);
  });

  const total = newAlerts.length + alerts.ongoing.count + alerts.recovered.count;
  return {
    ...alerts,
    new: { count: newAlerts.length, data: newAlerts },
    all: { count: total, data: [...newAlerts, ...alerts.ongoing.data, ...alerts.recovered.data] },
  };
};
