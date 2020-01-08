/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { ROUTES } from '../../../common/constants';
import { Cluster } from 'plugins/logstash/models/cluster';

export class ClusterService {
  constructor($http) {
    this.$http = $http;
    this.basePath = chrome.addBasePath(ROUTES.API_ROOT);
  }

  loadCluster() {
    return this.$http.get(`${this.basePath}/cluster`).then(response => {
      if (!response.data) {
        return;
      }
      return Cluster.fromUpstreamJSON(response.data.cluster);
    });
  }

  isClusterInfoAvailable() {
    return this.loadCluster()
      .then(cluster => Boolean(cluster))
      .catch(() => false);
  }
}
