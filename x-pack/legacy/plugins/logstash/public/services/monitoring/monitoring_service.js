/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import chrome from 'ui/chrome';
import { ROUTES, MONITORING } from '../../../common/constants';
import { PipelineListItem } from 'plugins/logstash/models/pipeline_list_item';

export class MonitoringService {
  constructor($http, Promise, monitoringUiEnabled, clusterService) {
    this.$http = $http;
    this.Promise = Promise;
    this.monitoringUiEnabled = monitoringUiEnabled;
    this.clusterService = clusterService;
    this.basePath = chrome.addBasePath(ROUTES.MONITORING_API_ROOT);
  }

  isMonitoringEnabled() {
    return this.monitoringUiEnabled;
  }

  getPipelineList() {
    if (!this.isMonitoringEnabled()) {
      return Promise.resolve([]);
    }

    return this.clusterService
      .loadCluster()
      .then(cluster => {
        const url = `${this.basePath}/v1/clusters/${cluster.uuid}/logstash/pipeline_ids`;
        const now = moment.utc();
        const body = {
          timeRange: {
            max: now.toISOString(),
            min: now.subtract(MONITORING.ACTIVE_PIPELINE_RANGE_S, 'seconds').toISOString(),
          },
        };
        return this.$http.post(url, body);
      })
      .then(response =>
        response.data.map(pipeline => PipelineListItem.fromUpstreamMonitoringJSON(pipeline))
      )
      .catch(() => []);
  }
}
