/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { Legacy } from 'kibana';
import { Logger } from 'src/core/server';
import { INDEX_PATTERN_ELASTICSEARCH, ALERT_TYPE_CLUSTER_STATE } from '../../common/constants';
import { AlertType } from '../../../alerting';
import { fetchDefaultEmailAddress } from '../lib/alerts/fetch_default_email_address';
import { fetchClusters } from '../lib/alerts/fetch_clusters';
import { fetchAvailableCcs } from '../lib/alerts/fetch_available_ccs';
import { getCcsIndexPattern } from '../lib/alerts/get_ccs_index_pattern';
import { executeActions, getUiMessage } from '../lib/alerts/cluster_state.lib';
import { fetchClusterState } from '../lib/alerts/fetch_cluster_state';
import {
  AlertCommonExecutorOptions,
  AlertCommonState,
  AlertClusterStatePerClusterState,
  AlertCommonCluster,
} from './types';
import { AlertClusterStateState } from './enums';

export const getClusterState = (
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

  const logger = getLogger([ALERT_TYPE_CLUSTER_STATE]);
  return {
    id: ALERT_TYPE_CLUSTER_STATE,
    name: 'Monitoring Alert - Cluster Status',
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
      const states = await fetchClusterState(callCluster, clusters, esIndexPattern);
      if (states.length === 0) {
        logger.warn(`No states found for ${ALERT_TYPE_CLUSTER_STATE}.`);
        return state;
      }

      const uiSettings = server.newPlatform.__internals.uiSettings.asScopedToClient(
        services.savedObjectsClient
      );
      const emailAddress = await fetchDefaultEmailAddress(uiSettings);
      if (!emailAddress) {
        // TODO: we can do more here
        logger.warn(
          `Unable to send email for ${ALERT_TYPE_CLUSTER_STATE} because there is no email configured.`
        );
        return;
      }

      const result: AlertCommonState = { ...state };
      const defaultAlertState: AlertClusterStatePerClusterState = {
        state: AlertClusterStateState.Green,
        ui: {
          isFiring: false,
          message: null,
          severity: 0,
          resolvedMS: 0,
          triggeredMS: 0,
          lastCheckedMS: 0,
        },
      };

      for (const clusterState of states) {
        const alertState: AlertClusterStatePerClusterState =
          (state[clusterState.clusterUuid] as AlertClusterStatePerClusterState) ||
          defaultAlertState;
        const cluster = clusters.find(
          (c: AlertCommonCluster) => c.clusterUuid === clusterState.clusterUuid
        );
        if (!cluster) {
          logger.warn(`Unable to find cluster for clusterUuid='${clusterState.clusterUuid}'`);
          continue;
        }
        const isNonGreen = clusterState.state !== AlertClusterStateState.Green;
        const severity = clusterState.state === AlertClusterStateState.Red ? 2100 : 1100;

        const ui = alertState.ui;
        let triggered = ui.triggeredMS;
        let resolved = ui.resolvedMS;
        let message = ui.message || {};
        let lastState = alertState.state;
        const instance = services.alertInstanceFactory(ALERT_TYPE_CLUSTER_STATE);

        if (isNonGreen) {
          if (lastState === AlertClusterStateState.Green) {
            logger.debug(`Cluster state changed from green to ${clusterState.state}`);
            executeActions(instance, cluster, clusterState.state, emailAddress);
            lastState = clusterState.state;
            triggered = moment().valueOf();
          }
          message = getUiMessage(clusterState.state);
          resolved = 0;
        } else if (!isNonGreen && lastState !== AlertClusterStateState.Green) {
          logger.debug(`Cluster state changed from ${lastState} to green`);
          executeActions(instance, cluster, clusterState.state, emailAddress, true);
          lastState = clusterState.state;
          message = getUiMessage(clusterState.state, true);
          resolved = moment().valueOf();
        }

        result[clusterState.clusterUuid] = {
          state: lastState,
          ui: {
            message,
            isFiring: isNonGreen,
            severity,
            resolvedMS: resolved,
            triggeredMS: triggered,
            lastCheckedMS: moment().valueOf(),
          },
        } as AlertClusterStatePerClusterState;
      }

      return result;
    },
  };
};
