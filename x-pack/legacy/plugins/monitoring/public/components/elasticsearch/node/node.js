/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageContent,
  EuiPageBody,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
} from '@elastic/eui';
import { NodeDetailStatus } from '../node_detail_status';
import { Logs } from '../../logs/';
import { MonitoringTimeseriesContainer } from '../../chart';
import { ShardAllocation } from '../shard_allocation/shard_allocation';

export const Node = ({
  nodeSummary,
  metrics,
  logs,
  nodeId,
  clusterUuid,
  scope,
  kbnUrl,
  ...props
}) => {
  const metricsToShow = [
    metrics.node_jvm_mem,
    metrics.node_mem,
    metrics.node_total_io,
    metrics.node_cpu_metric,
    metrics.node_load_average,
    metrics.node_latency,
    metrics.node_segment_count,
  ];

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPanel>
          <NodeDetailStatus stats={nodeSummary} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPageContent>
          <EuiFlexGrid columns={2} gutterSize="s">
            {metricsToShow.map((metric, index) => (
              <EuiFlexItem key={index}>
                <MonitoringTimeseriesContainer series={metric} {...props} />
                <EuiSpacer />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        </EuiPageContent>
        <EuiSpacer size="m" />
        <EuiPanel>
          <Logs logs={logs} nodeId={nodeId} clusterUuid={clusterUuid} />
        </EuiPanel>
        <EuiSpacer size="m" />
        <EuiPanel>
          <ShardAllocation scope={scope} kbnUrl={kbnUrl} />
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
};
