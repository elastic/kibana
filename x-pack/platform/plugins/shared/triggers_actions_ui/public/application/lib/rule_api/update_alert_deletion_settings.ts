/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import {
  RulesSettingsAlertDeletion,
  RulesSettingsAlertDeletionProperties,
} from '@kbn/alerting-plugin/common';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
// import { INTERNAL_BASE_ALERTING_API_PATH } from '../../constants';

const rewriteBodyRes: RewriteRequestCase<RulesSettingsAlertDeletion> = ({ ...rest }: any) => ({
  ...rest,
});

export const updateAlertDeletionSettings = async ({
  http,
  alertDeletionSettings,
}: {
  http: HttpSetup;
  alertDeletionSettings: RulesSettingsAlertDeletionProperties;
}) => {
  let body: string;
  try {
    body = JSON.stringify({
      is_active_alert_deletion_enabled: alertDeletionSettings.isActiveAlertDeletionEnabled,
      is_inactive_alert_deletion_enabled: alertDeletionSettings.isInactiveAlertDeletionEnabled,
      active_alert_deletion_threshold: alertDeletionSettings.activeAlertDeletionThreshold,
      inactive_alert_deletion_threshold: alertDeletionSettings.inactiveAlertDeletionThreshold,
    });
  } catch (e) {
    throw new Error(`Unable to parse alert deletion settings update params: ${e}`);
  }

  // TODO: https://github.com/elastic/kibana/issues/209258
  // const res = await http.post<AsApiContract<RulesSettingsAlertDeletion>>(
  //   `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_deletion`,
  //   {
  //     body,
  //   }
  // );

  const response: AsApiContract<RulesSettingsAlertDeletion> = await new Promise((resolve) => {
    resolve({
      is_active_alert_deletion_enabled: alertDeletionSettings.isActiveAlertDeletionEnabled,
      is_inactive_alert_deletion_enabled: alertDeletionSettings.isInactiveAlertDeletionEnabled,
      active_alert_deletion_threshold: alertDeletionSettings.activeAlertDeletionThreshold,
      inactive_alert_deletion_threshold: alertDeletionSettings.inactiveAlertDeletionThreshold,
      created_by: null,
      updated_by: null,
      created_at: '2021-08-25T14:00:00.000Z',
      updated_at: '2021-08-25T14:00:00.000Z',
    });
  });

  return rewriteBodyRes(response);
};
