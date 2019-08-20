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
const getColumns = (showCgroupMetricsElasticsearch, setupMode) => {
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
    render: (value, node) => {
      let nameLink = (
        <EuiLink
          href={`#/elasticsearch/nodes/${node.resolver}`}
          data-test-subj={`nodeLink-${node.resolver}`}
        >
          {value}
        </EuiLink>
      );

      if (setupMode && setupMode.enabled) {
        const list = _.get(setupMode, 'data.byUuid', {});
        const status = list[node.resolver] || {};
        if (status.isNetNewUser) {
          nameLink = value;
        }
      }

      return (
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
                {nameLink}
              </span>
            </EuiText>
          </div>
          <div className="monTableCell__transportAddress">
            {extractIp(node.transport_address)}
          </div>
        </div>
      );
    }
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

export function ElasticsearchNodes({ clusterStatus, showCgroupMetricsElasticsearch, ...props }) {
  const { sorting, pagination, onTableChange, clusterUuid, setupMode } = props;
  const columns = getColumns(showCgroupMetricsElasticsearch, setupMode);

  // Merge the nodes data with the setup data if enabled
  const nodes = props.nodes || [];
  if (setupMode.enabled && setupMode.data) {
    // We want to create a seamless experience for the user by merging in the setup data
    // and the node data from monitoring indices in the likely scenario where some nodes
    // are using MB collection and some are using no collection
    const nodesByUuid = nodes.reduce((byUuid, node) => ({
      ...byUuid,
      [node.id || node.resolver]: node
    }), {});

    nodes.push(...Object.entries(setupMode.data.byUuid)
      .reduce((nodes, [nodeUuid, instance]) => {
        if (!nodesByUuid[nodeUuid]) {
          nodes.push(instance.node);
        }
        return nodes;
      }, []));
  }

  let netNewUserMessage = null;
  let disableInternalCollectionForMigrationMessage = null;
  if (setupMode.data) {
    // Think net new user scenario
    const hasInstances = setupMode.data.totalUniqueInstanceCount > 0;
    if (hasInstances && setupMode.data.totalUniquePartiallyMigratedCount === setupMode.data.totalUniqueInstanceCount) {
      const finishMigrationAction = _.get(setupMode.meta, 'liveClusterUuid') === clusterUuid
        ? setupMode.shortcutToFinishMigration
        : setupMode.openFlyout;

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
            <EuiButton onClick={finishMigrationAction} size="s" color="warning" fill>
              {i18n.translate('xpack.monitoring.elasticsearch.nodes.metribeatMigration.disableInternalCollectionMigrationButtonLabel', {
                defaultMessage: 'Disable and finish migration'
              })}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="m"/>
        </Fragment>
      );
    }
    else if (!hasInstances) {
      netNewUserMessage = (
        <Fragment>
          <EuiCallOut
            title={i18n.translate('xpack.monitoring.elasticsearch.nodes.metribeatMigration.netNewUserTitle', {
              defaultMessage: 'No monitoring data detected',
            })}
            color="danger"
            iconType="cross"
          >
            <p>
              {i18n.translate('xpack.monitoring.elasticsearch.nodes.metribeatMigration.netNewUserDescription', {
                defaultMessage: `We did not detect any monitoring data, but we did detect the following Elasticsearch nodes.
                Each detected node is listed below along with a Setup button. Clicking this button will guide you through
                the process of enabling monitoring for each node.`
              })}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m"/>
        </Fragment>
      );
    }
  }

  function renderClusterStatus() {
    if (!clusterStatus) {
      return null;
    }
    return (
      <Fragment>
        <EuiPanel>
          <ClusterStatus stats={clusterStatus} />
        </EuiPanel>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  return (
    <EuiPage>
      <EuiPageBody>
        {renderClusterStatus()}
        {disableInternalCollectionForMigrationMessage}
        {netNewUserMessage}
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
            setupNewButtonLabel={i18n.translate('xpack.monitoring.elasticsearch.metricbeatMigration.setupNewButtonLabel', {
              defaultMessage: 'Setup monitoring for new Elasticsearch node'
            })}
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
