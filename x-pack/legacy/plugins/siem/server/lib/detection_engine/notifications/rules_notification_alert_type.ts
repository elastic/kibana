/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { NOTIFICATIONS_ID } from '../../../../common/constants';
import { AlertAction } from '../../../../../../../plugins/alerting/common';

import { NotificationAlertTypeDefinition } from './types';
import { buildSignalsSearchQuery } from './build_signals_query';
import { getNotificationResultsLink } from './utils';

interface AlertAttributes {
  enabled: boolean;
  name: string;
  tags: string[];
  actions: AlertAction[];
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
  version,
}: {
  logger: Logger;
  version: string;
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
      ruleId: schema.string(),
    }),
  },
  async executor({ previousStartedAt, alertId, services, params }) {
    const ruleAlertSavedObject = await services.savedObjectsClient.get<AlertAttributes>(
      'alert',
      params.ruleAlertId
    );
    logger.warn(`ruleAlertSavedObject ${JSON.stringify(ruleAlertSavedObject, null, 2)}`);
    const fromInMs = moment(previousStartedAt ?? undefined).format('x');
    const toInMs = moment().format('x');
    const resultsLink = getNotificationResultsLink({
      id: ruleAlertSavedObject.id,
      from: fromInMs,
      to: toInMs,
    });
    logger.warn(`resultsLink ${resultsLink}`);
    logger.warn(`notification params ${JSON.stringify(params)}`);

    const query = buildSignalsSearchQuery({
      index: ruleAlertSavedObject.attributes.params.outputIndex,
      ruleIds: [ruleAlertSavedObject.attributes.params.ruleId],
      to: toInMs,
      from: previousStartedAt ? moment(previousStartedAt).format('x') : `now-1h`,
    });

    const signalsQueryResult = await services.callCluster('search', query);
    const signalsCount = signalsQueryResult.hits.total.value;

    // // if (signalsCount) {
    const alertInstance = services.alertInstanceFactory(alertId);
    alertInstance
      .replaceState({
        signalsCount,
      })
      .scheduleActions('default', {
        resultsLink,
        rule: ruleAlertSavedObject.attributes.params,
      });
    // }

    logger.warn('SIEM NOTIFICATIONS');
    // logger.warn(signalsQueryResult);
    logger.warn(`previousStartedAt ${previousStartedAt}`);
    logger.warn(`alertId ${alertId}`);
    logger.warn(`params ${JSON.stringify(params, null, 2)}`);
  },
});
