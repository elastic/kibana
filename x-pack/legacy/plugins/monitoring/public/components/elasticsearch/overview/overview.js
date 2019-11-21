/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ClusterStatus } from '../cluster_status';
import { ShardActivity } from '../shard_activity';
import { MonitoringTimeseriesContainer } from '../../chart';
import { EuiPage, EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiPageBody, EuiPageContent } from '@elastic/eui';
import { Logs } from '../../logs/logs';

export function ElasticsearchOverview({
  clusterStatus,
  metrics,
  logs,
  cluster,
  shardActivity,
  ...props
}) {
  const metricsToShow = [
    metrics.cluster_search_request_rate,
    metrics.cluster_query_latency,
    metrics.cluster_index_request_rate,
    metrics.cluster_index_latency,
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPanel>
          <ClusterStatus stats={clusterStatus} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiFlexGrid columns={2} gutterSize="s">
            {metricsToShow.map((metric, index) => (
              <EuiFlexItem key={index}>
                <MonitoringTimeseriesContainer
                  series={metric}
                  {...props}
                />
                <EuiSpacer />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageContent>
        <EuiSpacer size="m" />
        <EuiPanel>
          <Logs logs={logs} clusterUuid={cluster.cluster_uuid}/>
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel>
          <ShardActivity data={shardActivity} {...props} />
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
}
