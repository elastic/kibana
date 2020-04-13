/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ROUTES } from '../../../../../../plugins/logstash/common/constants';
import { Cluster } from '../../models/cluster';

export class ClusterService {
  constructor(http) {
    this.http = http;
    this.basePath = http.basePath.prepend(ROUTES.API_ROOT);
  }

  loadCluster() {
    return this.http.get(`${this.basePath}/cluster`).then(response => {
      if (!response) {
        return;
      }
      return Cluster.fromUpstreamJSON(response.cluster);
    });
  }

  isClusterInfoAvailable() {
    return this.loadCluster()
      .then(cluster => Boolean(cluster))
      .catch(() => false);
  }
}
