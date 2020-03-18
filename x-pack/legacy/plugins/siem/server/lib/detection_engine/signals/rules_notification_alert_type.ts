/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import dateMath from '@elastic/datemath';
import { NOTIFICATIONS_ID, DEFAULT_SEARCH_AFTER_PAGE_SIZE } from '../../../../common/constants';
import { AlertAction } from '../../../../../../../plugins/alerting/common';

import { buildEventsSearchQuery } from './build_events_query';
import { getInputIndex } from './get_input_output_index';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { getFilter } from './get_filter';
import { SignalRuleAlertTypeDefinition } from './types';
import { getGapBetweenRuns } from './utils';
import { ruleStatusSavedObjectType } from '../rules/saved_object_mappings';
import { IRuleSavedAttributesSavedObjectAttributes } from '../rules/types';
import { buildSignalsSearchQuery } from './build_signals_query';

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
}): SignalRuleAlertTypeDefinition => ({
  id: NOTIFICATIONS_ID,
  name: 'SIEM Notifications',
  actionGroups: [
    {
      id: 'default',
      name: i18n.translate('xpack.siem.detectionEngine.signalRuleAlert.actionGroups.default', {
        defaultMessage: 'Default',
      }),
    },
  ],
  defaultActionGroupId: 'default',
  validate: {
    params: schema.object({
      signalsIndex: schema.string(),
      rules: schema.arrayOf(
        schema.object({
          id: schema.string(),
          ruleId: schema.string(),
        })
      ),
    }),
  },
  async executor({ previousStartedAt, alertId, services, params }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savedObject = await services.savedObjectsClient.get<AlertAttributes>('alert', alertId);
    logger.warn(
      `notificaotin dates ${previousStartedAt} ${moment(previousStartedAt ?? undefined).format(
        'x'
      )} ${new Date()}`
    );
    logger.warn(JSON.stringify(savedObject, null, 2));
    logger.warn(`notification params ${JSON.stringify(params)}`);
    const name = savedObject.attributes.name;

    const query = buildSignalsSearchQuery({
      index: params.signalsIndex,
      ruleIds: params.rules.map(rule => rule.ruleId),
      to: 'now',
      // from: `now-${savedObject.attributes.schedule.interval}`,
      from: previousStartedAt ? moment(previousStartedAt).format('x') : `now-1h`,
    });

    const signalsQueryResult = await services.callCluster('search', query);
    const signalsCount = signalsQueryResult.hits.total.value;

    if (signalsCount) {
      const alertInstance = services.alertInstanceFactory(alertId);
      alertInstance
        .replaceState({
          signalsCount,
        })
        .scheduleActions('default', {
          index: params.signalsIndex,
          name,
        });
    }

    logger.warn('SIEM NOTIFICATIONS');
    logger.warn(signalsQueryResult);
    logger.warn(`previousStartedAt ${previousStartedAt}`);
    logger.warn(`alertId ${alertId}`);
    logger.warn(`savedObject ${savedObject.attributes}`);
    // logger.warn(`services ${JSON.stringify(services, null, 2)}`);
    logger.warn(`params ${JSON.stringify(params, null, 2)}`);
  },
});
