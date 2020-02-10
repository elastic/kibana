/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { Legacy } from 'kibana';
import { Logger } from 'src/core/server';
import { ALERT_TYPE_LICENSE_EXPIRATION, INDEX_PATTERN_ELASTICSEARCH } from '../../common/constants';
import { AlertType } from '../../../alerting';
import { fetchLicenses } from '../lib/alerts/fetch_licenses';
import { fetchDefaultEmailAddress } from '../lib/alerts/fetch_default_email_address';
import { fetchClusters } from '../lib/alerts/fetch_clusters';
import { fetchAvailableCcs } from '../lib/alerts/fetch_available_ccs';
import {
  AlertLicense,
  AlertCommonState,
  AlertLicensePerClusterState,
  AlertCommonExecutorOptions,
  AlertCommonCluster,
  AlertLicensePerClusterUiState,
} from './types';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { executeActions, getUiMessage } from '../lib/alerts/license_expiration.lib';

const EXPIRES_DAYS = [60, 30, 14, 7];

export const getLicenseExpiration = (
  server: Legacy.Server,
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
    async executor({ services, params, state }: AlertCommonExecutorOptions): Promise<any> {
      logger.debug(
        `Firing alert with params: ${JSON.stringify(params)} and state: ${JSON.stringify(state)}`
      );

      const callCluster = await getCallCluster(services);

      // Support CCS use cases by querying to find available remote clusters
      // and then adding those to the index pattern we are searching against
      let esIndexPattern = INDEX_PATTERN_ELASTICSEARCH;
      if (ccsEnabled) {
        const availableCcs = await fetchAvailableCcs(callCluster);
        if (availableCcs.length > 0) {
          esIndexPattern = getCcsIndexPattern(esIndexPattern, availableCcs);
        }
      }

      const clusters = await fetchClusters(callCluster, esIndexPattern);

      // Fetch licensing information from cluster_stats documents
      const licenses: AlertLicense[] = await fetchLicenses(callCluster, clusters, esIndexPattern);
      if (licenses.length === 0) {
        logger.warn(`No license found for ${ALERT_TYPE_LICENSE_EXPIRATION}.`);
        return state;
      }

      const uiSettings = server.newPlatform.__internals.uiSettings.asScopedToClient(
        services.savedObjectsClient
      );
      const dateFormat: string = await uiSettings.get<string>('dateFormat');
      const emailAddress = await fetchDefaultEmailAddress(uiSettings);
      if (!emailAddress) {
        // TODO: we can do more here
        logger.warn(
          `Unable to send email for ${ALERT_TYPE_LICENSE_EXPIRATION} because there is no email configured.`
        );
        return;
      }

      const result: AlertCommonState = { ...state };
      const defaultAlertState: AlertLicensePerClusterState = {
        expiredCheckDateMS: 0,
        ui: {
          isFiring: false,
          message: null,
          severity: 0,
          resolvedMS: 0,
        },
      };

      for (const license of licenses) {
        const alertState: AlertLicensePerClusterState =
          (state[license.clusterUuid] as AlertLicensePerClusterState) || defaultAlertState;
        const cluster = clusters.find(
          (c: AlertCommonCluster) => c.clusterUuid === license.clusterUuid
        );
        if (!cluster) {
          logger.warn(`Unable to find cluster for clusterUuid='${license.clusterUuid}'`);
          continue;
        }

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

            const $fromNow = moment.utc().add(EXPIRES_DAYS[i], 'days');
            if ($fromNow.isAfter($expiry)) {
              isExpired = true;
              severity = 1000 * i;
              break;
            }
          }
        }

        const ui = alertState.ui;
        let triggered = ui.triggeredMS;
        let resolved = ui.resolvedMS;
        let message = ui.message;
        let expiredCheckDate = alertState.expiredCheckDateMS;
        const instance = services.alertInstanceFactory(ALERT_TYPE_LICENSE_EXPIRATION);

        if (isExpired) {
          if (!alertState.expiredCheckDateMS) {
            logger.debug(`License will expire soon, sending email`);
            executeActions(instance, cluster, $expiry, dateFormat, emailAddress);
            expiredCheckDate = triggered = moment().valueOf();
          }
          message = getUiMessage();
          resolved = 0;
        } else if (!isExpired && alertState.expiredCheckDateMS) {
          logger.debug(`License expiration has been resolved, sending email`);
          executeActions(instance, cluster, $expiry, dateFormat, emailAddress, true);
          expiredCheckDate = 0;
          message = getUiMessage(true);
          resolved = moment().valueOf();
        }

        result[license.clusterUuid] = {
          expiredCheckDateMS: expiredCheckDate,
          ui: {
            message,
            expirationTime: license.expiryDateMS,
            isFiring: expiredCheckDate > 0,
            severity,
            resolvedMS: resolved,
            triggeredMS: triggered,
            lastCheckedMS: moment().valueOf(),
          } as AlertLicensePerClusterUiState,
        } as AlertLicensePerClusterState;
      }

      return result;
    },
  };
};
