/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { NOTIFICATIONS_ID } from '../../../../common/constants';

import { NotificationAlertTypeDefinition } from './types';
import { buildSignalsSearchQuery } from './build_signals_query';
import { getNotificationResultsLink } from './utils';

interface AlertAttributes {
  enabled: boolean;
  name: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  schedule: {
    interval: string;
  };
  throttle: string | null;
}
export const rulesNotificationAlertType = ({
  logger,
}: {
  logger: Logger;
}): NotificationAlertTypeDefinition => ({
  id: NOTIFICATIONS_ID,
  name: 'SIEM Notifications',
  actionGroups: [
    {
      id: 'default',
      name: i18n.translate(
        'xpack.siem.detectionEngine.ruleNotificationAlert.actionGroups.default',
        {
          defaultMessage: 'Default',
        }
      ),
    },
  ],
  defaultActionGroupId: 'default',
  validate: {
    params: schema.object({
      ruleAlertId: schema.string(),
    }),
  },
  async executor({ previousStartedAt, alertId, services, params }) {
    const ruleAlertSavedObject = await services.savedObjectsClient.get<AlertAttributes>(
      'alert',
      params.ruleAlertId
    );
    const { params: ruleParams } = ruleAlertSavedObject.attributes;
    const fromInMs = previousStartedAt ? moment(previousStartedAt).format('x') : 'now-1h';
    const toInMs = moment().format('x');

    const query = buildSignalsSearchQuery({
      index: ruleParams.outputIndex,
      ruleId: ruleParams.ruleId,
      to: toInMs,
      from: fromInMs,
    });

    const signalsQueryResult = await services.callCluster('search', query);
    const signalsCount = signalsQueryResult.hits.total.value;
    logger.info(
      `Found ${signalsCount} signals using signal rule name: "${ruleParams.name}", id: "${params.ruleAlertId}", rule_id: "${ruleParams.ruleId}" in "${ruleParams.outputIndex}" index`
    );

    if (signalsCount) {
      const resultsLink = getNotificationResultsLink({
        id: ruleAlertSavedObject.id,
        from: fromInMs,
        to: toInMs,
      });
      const alertInstance = services.alertInstanceFactory(alertId);
      alertInstance
        .replaceState({
          signalsCount,
        })
        .scheduleActions('default', {
          resultsLink,
          rule: ruleParams,
        });
    }
  },
});
