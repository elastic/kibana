/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { AlertCommonPerClusterState } from '../../alerts/types';
import { ALERT_TYPES, LOGGING_TAG } from '../../../common/constants';
import { AlertsClient } from '../../../../alerting/server/alerts_client';

export async function fetchStatus(
  alertsClient: AlertsClient,
  start: number,
  end: number,
  server: any
): Promise<any[]> {
  const statuses = await Promise.all(
    ALERT_TYPES.map(
      type =>
        new Promise(async (resolve, reject) => {
          // We need to get the id from the alertTypeId
          const alerts = await alertsClient.find({
            options: {
              filter: `alert.attributes.alertTypeId:${type}`,
            },
          });
          if (alerts.total !== 1) {
            server.log(
              ['warning', LOGGING_TAG],
              `Found more than one alert for type ${type} which is unexpected.`
            );
          }

          const id = alerts.data[0].id;

          // Now that we hvae the id, we can get the state
          const states = await alertsClient.getAlertState({ id });
          if (!states || !states.alertTypeState) {
            server.log(
              ['warning', LOGGING_TAG],
              `No alert states found for type ${type} which is unexpected.`
            );
            return reject(null);
          }

          const state = Object.values(states.alertTypeState)[0] as AlertCommonPerClusterState;
          const isInBetween = moment(state.ui.resolvedMS).isBetween(start, end);
          if (state.ui.isFiring || isInBetween) {
            return resolve({
              type,
              ...state.ui,
            });
          }
          return resolve(false);
        })
    )
  );

  return statuses.filter(Boolean);
}
