/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Logger } from 'src/core/server';
import {
  ALERT_TYPE_LICENSE_EXPIRATION,
  CALCULATE_DURATION_UNTIL,
  INDEX_PATTERN_ELASTICSEARCH,
} from '../../common/constants';
// @ts-ignore
import { formatTimestampToDuration } from '../../common';
import { AlertType } from '../../../alerting';
// @ts-ignore
import { fetchLicenses } from '../lib/alerts/fetch_licenses';
import { fetchDefaultEmailAddress } from '../lib/alerts/fetch_default_email_address';
import { fetchClusters } from '../lib/alerts/fetch_clusters';
import { fetchAvailableCcs } from '../lib/alerts/fetch_available_ccs';
import {
  AlertLicense,
  AlertState,
  AlertClusterState,
  AlertClusterUiState,
  LicenseExpirationAlertExecutorOptions,
  AlertParams,
} from './types';

const EXPIRES_DAYS = [60, 30, 14, 7];

export const getLicenseExpiration = (
  getMonitoringCluster: any,
  getLogger: (contexts: string[]) => Logger,
  ccsEnabled: boolean
): AlertType => {
  async function getCallCluster(services: any): Promise<any> {
    const monitoringCluster = await getMonitoringCluster();
    if (!monitoringCluster) {
      return services.callCluster;
    }

    return monitoringCluster.callCluster;
  }

  const logger = getLogger([ALERT_TYPE_LICENSE_EXPIRATION]);
  return {
    id: ALERT_TYPE_LICENSE_EXPIRATION,
    name: 'Monitoring Alert - License Expiration',
    actionGroups: ['default'],
    async executor({
      services,
      params,
      state,
    }: LicenseExpirationAlertExecutorOptions): Promise<any> {
      logger.debug(
        `Firing alert with params: ${JSON.stringify(params)} and state: ${JSON.stringify(state)}`
      );
      const { dateFormat, timezone } = params as AlertParams;

      const callCluster = await getCallCluster(services);

      // Support CCS use cases by querying to find available remote clusters
      // and then adding those to the index pattern we are searching against
      let esIndexPattern = INDEX_PATTERN_ELASTICSEARCH;
      if (ccsEnabled) {
        const availableCcs = await fetchAvailableCcs(callCluster);
        if (availableCcs.length > 0) {
          esIndexPattern = `${esIndexPattern},${esIndexPattern
            .split(',')
            .map(pattern => {
              return availableCcs.map(remoteName => `${remoteName}:${pattern}`).join(',');
            })
            .join(',')}`;
        }
      }

      const clusters = await fetchClusters(callCluster, esIndexPattern);

      // Fetch licensing information from cluster_stats documents
      const licenses: AlertLicense[] = await fetchLicenses(callCluster, clusters, esIndexPattern);
      if (licenses.length === 0) {
        logger.warn(`No license found for ${ALERT_TYPE_LICENSE_EXPIRATION}.`);
        return state;
      }

      const emailAddress = await fetchDefaultEmailAddress(services.savedObjectsClient);
      if (!emailAddress) {
        // TODO: we can do more here
        logger.warn(
          `Unable to send email for ${ALERT_TYPE_LICENSE_EXPIRATION} because there is no email configured.` +
            ` Please configure 'xpack.monitoring.cluster_alerts.email_notifications.email_address'.`
        );
        return;
      }

      const result: AlertState = { ...state };

      for (const license of licenses) {
        const licenseState: AlertClusterState = state[license.clusterUuid] || {};
        const $expiry = moment.utc(license.expiryDateMS);
        let isExpired = false;
        let severity = 0;

        if (license.status !== 'active') {
          isExpired = true;
          severity = 2001;
        } else if (license.expiryDateMS) {
          for (let i = EXPIRES_DAYS.length - 1; i >= 0; i--) {
            if (license.type === 'trial' && i < 2) {
              break;
            }

            const $fromNow = moment().add(EXPIRES_DAYS[i], 'days');
            if ($fromNow.isAfter($expiry)) {
              isExpired = true;
              severity = 1000 * i;
              break;
            }
          }
        }

        const ui: AlertClusterUiState = get<AlertClusterUiState>(licenseState, 'ui', {
          isFiring: false,
          message: null,
          severity: 0,
          resolvedMS: 0,
        });
        let resolved = ui.resolvedMS;
        let message = ui.message;
        let expiredCheckDate = licenseState.expiredCheckDateMS;
        const instance = services.alertInstanceFactory(ALERT_TYPE_LICENSE_EXPIRATION);

        if (isExpired) {
          if (!licenseState.expiredCheckDateMS) {
            logger.debug(`License will expire soon, sending email`);
            instance.scheduleActions('default', {
              subject: 'NEW X-Pack Monitoring: License Expiration',
              message: `Cluster '${
                license.clusterName
              }' license is going to expire on ${$expiry.format(
                dateFormat
              )}. Please update your license.`,
              to: emailAddress,
            });
            expiredCheckDate = moment().valueOf();
          }
          message = i18n.translate('xpack.monitoring.alerts.ui.licenseExpiration.firingMessage', {
            defaultMessage: `This cluster's license is going to expire in {relative} at {absolute}.`,
            values: {
              relative: formatTimestampToDuration(
                license.expiryDateMS,
                CALCULATE_DURATION_UNTIL,
                null
              ),
              absolute: moment
                .tz(license.expiryDateMS, timezone !== 'Browser' ? timezone : moment.tz.guess())
                .format('LLL z'),
            },
          });
          resolved = 0;
        } else if (!isExpired && licenseState.expiredCheckDateMS) {
          logger.debug(`License expiration has been resolved, sending email`);
          instance.scheduleActions('default', {
            subject: 'RESOLVED X-Pack Monitoring: License Expiration',
            message: `This cluster alert has been resolved: Cluster '${
              license.clusterName
            }' license was going to expire on ${$expiry.format(dateFormat)}.`,
            to: emailAddress,
          });
          expiredCheckDate = 0;
          message = i18n.translate('xpack.monitoring.alerts.ui.licenseExpiration.resolvedMessage', {
            defaultMessage: `This cluster's license is active.`,
          });
          resolved = +new Date();
        }

        result[license.clusterUuid] = {
          expiredCheckDateMS: expiredCheckDate,
          ui: {
            message,
            isFiring: expiredCheckDate > 0,
            severity,
            resolvedMS: resolved,
          },
        };
      }

      return result;
    },
  };
};
