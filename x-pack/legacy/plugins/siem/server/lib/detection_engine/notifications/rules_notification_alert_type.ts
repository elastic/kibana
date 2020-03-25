/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { NOTIFICATIONS_ID } from '../../../../common/constants';

import { NotificationAlertTypeDefinition } from './types';
import { getSignalsCount } from './get_signals_count';
import { RuleAlertAttributes } from '../signals/types';
import { siemRuleActionGroups } from '../signals/siem_rule_action_groups';
import { scheduleNotificationActions } from './schedule_notification_actions';

export const rulesNotificationAlertType = ({
  logger,
}: {
  logger: Logger;
}): NotificationAlertTypeDefinition => ({
  id: NOTIFICATIONS_ID,
  name: 'SIEM Notifications',
  actionGroups: siemRuleActionGroups,
  defaultActionGroupId: 'default',
  validate: {
    params: schema.object({
      ruleAlertId: schema.string(),
    }),
  },
  async executor({ startedAt, previousStartedAt, alertId, services, params }) {
    const ruleAlertSavedObject = await services.savedObjectsClient.get<RuleAlertAttributes>(
      'alert',
      params.ruleAlertId
    );

    if (!ruleAlertSavedObject.attributes.params) {
      logger.error(`Saved object for alert ${params.ruleAlertId} was not found`);
      return;
    }

    const { params: ruleAlertParams, name: ruleName } = ruleAlertSavedObject.attributes;
    const ruleParams = { ...ruleAlertParams, name: ruleName, id: ruleAlertSavedObject.id };

    const { signalsCount, resultsLink } = await getSignalsCount({
      from: previousStartedAt ?? `now-${ruleParams.interval}`,
      to: startedAt,
      index: ruleParams.outputIndex,
      ruleId: ruleParams.ruleId!,
      kibanaSiemAppUrl: ruleAlertParams.meta?.kibanaSiemAppUrl as string,
      ruleAlertId: ruleAlertSavedObject.id,
      callCluster: services.callCluster,
    });

    logger.info(
      `Found ${signalsCount} signals using signal rule name: "${ruleParams.name}", id: "${params.ruleAlertId}", rule_id: "${ruleParams.ruleId}" in "${ruleParams.outputIndex}" index`
    );

    if (signalsCount) {
      const alertInstance = services.alertInstanceFactory(alertId);
      scheduleNotificationActions({ alertInstance, signalsCount, resultsLink, ruleParams });
    }
  },
});
