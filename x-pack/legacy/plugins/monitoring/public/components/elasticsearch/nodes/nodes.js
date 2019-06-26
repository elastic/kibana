/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { NodeStatusIcon } from '../node';
import { extractIp } from '../../../lib/extract_ip'; // TODO this is only used for elasticsearch nodes summary / node detail, so it should be moved to components/elasticsearch/nodes/lib
import { ClusterStatus } from '../cluster_status';
import { EuiMonitoringTable } from '../../table';
import { MetricCell, OfflineCell } from './cells';
import {
  EuiLink,
  EuiToolTip,
  EuiSpacer,
  EuiPage,
  EuiPageContent,
  EuiPageBody,
  EuiPanel,
  EuiCallOut,
  EuiButton,
  EuiText
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';

const getSortHandler = (type) => (item) => _.get(item, [type, 'summary', 'lastVal']);
const getColumns = showCgroupMetricsElasticsearch => {
  const cols = [];

  const cpuUsageColumnTitle = i18n.translate('xpack.monitoring.elasticsearch.nodes.cpuUsageColumnTitle', {
    defaultMessage: 'CPU Usage',
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.nameColumnTitle', {
      defaultMessage: 'Name',
    }),
    width: '20%',
    field: 'name',
    sortable: true,
    render: (value, node) => (
      <div>
        <div className="monTableCell__name">
          <EuiText size="m">
            <EuiToolTip
              position="bottom"
              content={node.nodeTypeLabel}
            >
              <span className={`fa ${node.nodeTypeClass}`} />
            </EuiToolTip>
            &nbsp;
            <span data-test-subj="name">
              <EuiLink
                href={`#/elasticsearch/nodes/${node.resolver}`}
                data-test-subj={`nodeLink-${node.resolver}`}
              >
                {value}
              </EuiLink>
            </span>
          </EuiText>
        </div>
        <div className="monTableCell__transportAddress">
          {extractIp(node.transport_address)}
        </div>
      </div>
    )
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.statusColumnTitle', {
      defaultMessage: 'Status',
    }),
    field: 'isOnline',
    sortable: true,
    render: value => {
      const status = value ? i18n.translate('xpack.monitoring.elasticsearch.nodes.statusColumn.onlineLabel', {
        defaultMessage: 'Online',
      }) : i18n.translate('xpack.monitoring.elasticsearch.nodes.statusColumn.offlineLabel', {
        defaultMessage: 'Offline',
      });
      return (
        <div className="monTableCell__status">
          <NodeStatusIcon
            isOnline={value}
            status={status}
          />{' '}
          {status}
        </div>
      );
    }
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.shardsColumnTitle', {
      defaultMessage: 'Shards',
    }),
    field: 'shardCount',
    sortable: true,
    render: (value, node) => {
      return node.isOnline ? (
        <div className="monTableCell__number" data-test-subj="shards">
          {value}
        </div>
      ) : <OfflineCell/>;
    }
  });

  if (showCgroupMetricsElasticsearch) {
    cols.push({
      name: cpuUsageColumnTitle,
      field: 'node_cgroup_quota',
      sortable: getSortHandler('node_cgroup_quota'),
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={true}
          data-test-subj="cpuQuota"
        />
      )
    });

    cols.push({
      name: i18n.translate('xpack.monitoring.elasticsearch.nodes.cpuThrottlingColumnTitle', {
        defaultMessage: 'CPU Throttling',
      }),
      field: 'node_cgroup_throttled',
      sortable: getSortHandler('node_cgroup_throttled'),
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={false}
          data-test-subj="cpuThrottled"
        />
      )
    });
  } else {
    cols.push({
      name: cpuUsageColumnTitle,
      field: 'node_cpu_utilization',
      sortable: getSortHandler('node_cpu_utilization'),
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={true}
          data-test-subj="cpuUsage"
        />
      )
    });

    cols.push({
      name: i18n.translate('xpack.monitoring.elasticsearch.nodes.loadAverageColumnTitle', {
        defaultMessage: 'Load Average',
      }),
      field: 'node_load_average',
      sortable: getSortHandler('node_load_average'),
      render: (value, node) => (
        <MetricCell
          isOnline={node.isOnline}
          metric={value}
          isPercent={false}
          data-test-subj="loadAverage"
        />
      )
    });
  }

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.jvmMemoryColumnTitle', {
      defaultMessage: '{javaVirtualMachine} Memory',
      values: {
        javaVirtualMachine: 'JVM'
      }
    }),
    field: 'node_jvm_mem_percent',
    sortable: getSortHandler('node_jvm_mem_percent'),
    render: (value, node) => (
      <MetricCell
        isOnline={node.isOnline}
        metric={value}
        isPercent={true}
        data-test-subj="jvmMemory"
      />
    )
  });

  cols.push({
    name: i18n.translate('xpack.monitoring.elasticsearch.nodes.diskFreeSpaceColumnTitle', {
      defaultMessage: 'Disk Free Space',
    }),
    field: 'node_free_space',
    sortable: getSortHandler('node_free_space'),
    render: (value, node) => (
      <MetricCell
        isOnline={node.isOnline}
        metric={value}
        isPercent={false}
        data-test-subj="diskFreeSpace"
      />
    )
  });

  return cols;
};

export function ElasticsearchNodes({ clusterStatus, nodes, showCgroupMetricsElasticsearch, ...props }) {
  const columns = getColumns(showCgroupMetricsElasticsearch);
  const { sorting, pagination, onTableChange, setupMode } = props;

  let disableInternalCollectionForMigrationMessage = null;
  if (setupMode.data) {
    if (setupMode.data.totalUniquePartiallyMigratedCount === setupMode.data.totalUniqueInstanceCount) {
      disableInternalCollectionForMigrationMessage = (
        <Fragment>
          <EuiCallOut
            title={i18n.translate('xpack.monitoring.elasticsearch.nodes.metribeatMigration.disableInternalCollectionTitle', {
              defaultMessage: 'Disable internal collection to finish the migration',
            })}
            color="warning"
            iconType="help"
          >
            <p>
              {i18n.translate('xpack.monitoring.elasticsearch.nodes.metribeatMigration.disableInternalCollectionDescription', {
                defaultMessage: `All of your Elasticsearch servers are monitored using Metricbeat,
                but you need to disable internal collection to finish the migration.`
              })}
            </p>
            <EuiButton onClick={() => setupMode.openFlyout()} size="s" color="warning" fill>
              {i18n.translate('xpack.monitoring.elasticsearch.nodes.metribeatMigration.disableInternalCollectionMigrationButtonLabel', {
                defaultMessage: 'Disable and finish migration'
              })}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="m"/>
        </Fragment>
      );
    }
  }

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPanel>
          <ClusterStatus stats={clusterStatus} />
        </EuiPanel>
        <EuiSpacer size="m" />
        {disableInternalCollectionForMigrationMessage}
        <EuiPageContent>
          <EuiMonitoringTable
            className="elasticsearchNodesTable"
            rows={nodes}
            columns={columns}
            sorting={sorting}
            pagination={pagination}
            setupMode={setupMode}
            uuidField="resolver"
            nameField="name"
            search={{
              box: {
                incremental: true,
                placeholder: i18n.translate('xpack.monitoring.elasticsearch.nodes.monitoringTablePlaceholder', {
                  defaultMessage: 'Filter Nodes…'
                }),
              },
            }}
            onTableChange={onTableChange}
            executeQueryOptions={{
              defaultFields: ['name']
            }}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
