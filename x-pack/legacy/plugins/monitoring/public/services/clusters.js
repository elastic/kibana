/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';
import { timefilter } from 'ui/timefilter';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../common/constants';
import { contains } from 'lodash';

function formatClusters(clusters) {
  return clusters.map(formatCluster);
}

function formatCluster(cluster) {
  if (cluster.cluster_uuid === STANDALONE_CLUSTER_CLUSTER_UUID) {
    cluster.cluster_name = 'Standalone Cluster';
  }
  return cluster;
}

const uiModule = uiModules.get('monitoring/clusters');
uiModule.service('monitoringClusters', ($injector) => {
  return (clusterUuid, ccs, codePaths) => {
    const { min, max } = timefilter.getBounds();

    // append clusterUuid if the parameter is given
    let url = '../api/monitoring/v1/clusters';
    if (clusterUuid) {
      url += `/${clusterUuid}`;
    }

    const $http = $injector.get('$http');
    const kbnUrl = $injector.get('kbnUrl');
    const errorHandler = (err) => {
      if ((!err || err.status) !== 403 && !contains(window.location.hash, 'no-data')) {
        kbnUrl.changePath('/no-data', null, null, err);
      }
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    };

    return $http.get('../api/monitoring/v1/clusters/remote_info').then(({ data }) => {
      for (const clusterName in data) {
        if (!data.hasOwnProperty(clusterName)) {
          continue;
        }
        const cluster = data[clusterName];
        if (!cluster.connected || !cluster.num_nodes_connected) {
          const clusterError = `There seems to be some issues with ${clusterName} ` +
          `cluster. Please make sure it's connected and has at least one node.`;
          return Promise.reject(clusterError);
        }
      }

      return $http.post(url, {
        ccs,
        timeRange: {
          min: min.toISOString(),
          max: max.toISOString()
        },
        codePaths
      }).then(({ data }) => formatClusters(data));
    }).catch(errorHandler);
  };
});
