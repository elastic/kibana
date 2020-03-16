/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
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
      ruleIds: schema.arrayOf(schema.string(), {
        defaultValue: ['f09e14ec-cae2-481e-a221-4c952aba5cc5'],
      }),
    }),
  },
  async executor({ previousStartedAt, alertId, services, params }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ruleIds: string[] = (params as any).ruleIds;
    const savedObject = await services.savedObjectsClient.get<AlertAttributes>('alert', alertId);
    logger.warn(JSON.stringify(savedObject, null, 2));
    const outputIndex = ['.siem-signals-patrykkopycinski*'];
    const name = savedObject.attributes.name;

    const query = buildSignalsSearchQuery({
      index: outputIndex,
      ruleIds,
      to: 'now',
      // from: `now-${savedObject.attributes.schedule.interval}`,
      from: `now-1h`,
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
          outputIndex,
          name,
        });
    }

    logger.warn('SIEM NOTIFICATIONS');
    logger.warn(signalsQueryResult);
    logger.warn(`previousStartedAt ${previousStartedAt}`);
    logger.warn(`alertId ${alertId}`);
    // logger.warn(`services ${JSON.stringify(services, null, 2)}`);
    logger.warn(`params ${JSON.stringify(params, null, 2)}`);
  },
});
