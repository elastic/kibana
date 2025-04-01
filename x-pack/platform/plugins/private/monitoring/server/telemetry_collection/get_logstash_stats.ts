/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import {
  INDEX_PATTERN_LOGSTASH,
  METRICBEAT_INDEX_NAME_UNIQUE_TOKEN,
  TELEMETRY_QUERY_SOURCE,
} from '../../common/constants';
import { LogstashSelfMonitoring } from './logstash_self_monitoring';
import { LogstashMetricbeatMonitoring } from './logstash_metricbeat_monitoring';
import { LogstashAgentMonitoring } from './logstash_agent_monitoring';
import {
  LogstashMonitoring,
  LogstashProcessOptions,
  LogstashStatsByClusterUuid,
} from './logstash_monitoring';

const SELF_MONITORING: string = 'self';
const METRICBEAT_MONITORING: string = 'metricbeat';
const AGENT_MONITORING: string = 'agent';

export const logstashMonitoringInstances: { [key: string]: LogstashMonitoring } = {
  self: new LogstashSelfMonitoring(),
  metricbeat: new LogstashMetricbeatMonitoring(),
  agent: new LogstashAgentMonitoring(),
};

/*
 * Call the function for fetching and summarizing Logstash stats
 * @return {Object} - Logstash stats in an object keyed by the cluster UUIDs
 */
export async function getLogstashStats(
  callCluster: ElasticsearchClient,
  clusterUuids: string[],
  start: string,
  end: string
): Promise<LogstashStatsByClusterUuid> {
  const options: LogstashProcessOptions = {
    clusters: {}, // the result object to be built up
    allEphemeralIds: {},
    allHostIds: {},
    versions: {},
    plugins: {},
  };
  const monitoringClusterInfo = await callCluster.info();
  const monitoringClusterUuid: string = monitoringClusterInfo.cluster_uuid;

  // figure out the monitoring methods cluster is using based on the Logstash metrics indices
  // mostly single method will be resolved
  // multiple monitoring methods case might be due to migration (ex: from self to metricbeat)
  const monitoringMethods: string[] = await getLogstashMonitoringMethods(callCluster);

  // collect all _method_ (:self, :metricbeat, :agent) metrics in a given period
  for (const monitoringMethod of monitoringMethods) {
    const monitoringInstance = logstashMonitoringInstances[monitoringMethod];
    if (monitoringInstance) {
      await monitoringInstance.collectMetrics(
        callCluster,
        clusterUuids,
        monitoringClusterUuid,
        start,
        end,
        options
      );
    }
  }
  return options.clusters;
}

export async function getLogstashMonitoringMethods(
  callCluster: ElasticsearchClient
): Promise<string[]> {
  const response = await callCluster.cat.indices(
    { index: INDEX_PATTERN_LOGSTASH, format: 'json' },
    {
      headers: {
        'X-QUERY-SOURCE': TELEMETRY_QUERY_SOURCE,
      },
    }
  );

  const monitoringMethods: string[] = [];
  for (const record of response) {
    if (record.index!.indexOf('monitoring-logstash-') !== -1) {
      if (record.index!.indexOf(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN) !== -1) {
        // legacy driven metricbeat monitoring
        if (!monitoringMethods.includes(METRICBEAT_MONITORING)) {
          monitoringMethods.push(METRICBEAT_MONITORING);
          logstashMonitoringInstances.metricbeat.setIndexPattern('legacy');
        }
      } else {
        if (!monitoringMethods.includes(SELF_MONITORING)) {
          monitoringMethods.push(SELF_MONITORING);
        }
      }
    } else if (record.index!.indexOf('metrics-logstash.node') !== -1) {
      if (!monitoringMethods.includes(AGENT_MONITORING)) {
        monitoringMethods.push(AGENT_MONITORING);
      }
    } else if (record.index!.indexOf('metrics-logstash.stack_monitoring') !== -1) {
      if (!monitoringMethods.includes(METRICBEAT_MONITORING)) {
        monitoringMethods.push(METRICBEAT_MONITORING);
        logstashMonitoringInstances.metricbeat.setIndexPattern('stack');
      }
    }
  }

  return monitoringMethods;
}
