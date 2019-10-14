/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import moment, { Moment } from 'moment';
import {
  ALERT_TYPE_LICENSE_EXPIRATION,
  INDEX_PATTERN_ELASTICSEARCH,
} from '../../../common/constants';
import { AlertType, AlertExecutorOptions } from '../../../../alerting';

interface License {
  status: string;
  type: string;
  expiry_date_in_millis: number;
}

interface AlertState {
  expired_check_date_in_millis: number | Moment;
}

const EXPIRES_DAYS = [60, 30, 14, 7];

async function fetchLicense(callCluster: any, clusterUuid: string): Promise<License> {
  const params = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    filterPath: 'hits.hits._source.license.*',
    body: {
      size: 1,
      sort: [{ timestamp: { order: 'desc' } }],
      query: {
        bool: {
          filter: [
            {
              term: {
                cluster_uuid: clusterUuid,
              },
            },
            {
              term: {
                type: 'cluster_stats',
              },
            },
            {
              range: {
                timestamp: {
                  gte: 'now-2m',
                },
              },
            },
          ],
        },
      },
    },
  };

  const response = await callCluster('search', params);
  return get(response, 'hits.hits[0]._source.license');
}

export const getLicenseExpiration = (getMonitoringCluster: any): AlertType => {
  async function getCallCluster(services: any): Promise<any> {
    const monitoringCluster = await getMonitoringCluster();
    if (!monitoringCluster) {
      return services.callCluster;
    }

    return monitoringCluster.callCluster;
  }

  return {
    id: ALERT_TYPE_LICENSE_EXPIRATION,
    name: 'Monitoring Alert - License Expiration',
    actionGroups: ['default'],
    async executor({ services, params, state }: AlertExecutorOptions): Promise<any> {
      // console.log('firing', { params, state });

      const $now = moment();
      const { clusterUuid } = params;
      const callCluster = await getCallCluster(services);

      // Fetch licensing information from cluster_stats documents
      const license: License = await fetchLicense(callCluster, clusterUuid);
      if (!license) {
        return state;
      }

      const $expiry = moment.utc(license.expiry_date_in_millis);
      let isExpired = false;

      if (license.status !== 'active') {
        isExpired = true;
      } else if (license.expiry_date_in_millis) {
        for (let i = EXPIRES_DAYS.length - 1; i >= 0; i--) {
          if (license.type === 'trial' && i < 2) {
            break;
          }

          const $fromNow = $now.add(EXPIRES_DAYS[i] * 24 * 60 * 60 * 1000);
          if ($fromNow.isAfter($expiry)) {
            isExpired = true;
          }
        }
      }

      const result: AlertState = { ...state };
      const instance = services.alertInstanceFactory(ALERT_TYPE_LICENSE_EXPIRATION);

      if (isExpired && !state.expired_check_date_in_millis) {
        instance.scheduleActions('default', {
          subject: 'NEW X-Pack Monitoring: License Expiration',
          message: `This cluster's license is going to expire on ${$expiry.format()}. Please update your license.`,
        });
        result.expired_check_date_in_millis = $now.utc();
      } else if (!isExpired && state.expired_check_date_in_millis) {
        instance.scheduleActions('default', {
          subject: 'RESOLVED X-Pack Monitoring: License Expiration',
          message: `This cluster alert has been resolved: This cluster's license was going to expire on ${$expiry.format()}.`,
        });
        result.expired_check_date_in_millis = 0;
      }

      return result;
    },
  };
};
