/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { get, capitalize } from 'lodash';
import { formatNumber } from 'plugins/monitoring/lib/format_number';
import {
  ClusterItemContainer,
  HealthStatusIndicator,
  BytesPercentageUsage,
  DisabledIfNoDataAndInSetupModeLink,
} from './helpers';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiPanel,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
  EuiBadge,
  EuiToolTip,
  EuiFlexGroup,
} from '@elastic/eui';
import { LicenseText } from './license_text';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Reason } from '../../logs/reason';
import { SetupModeTooltip } from '../../setup_mode/tooltip';
import { ELASTICSEARCH_SYSTEM_ID } from '../../../../common/constants';

const calculateShards = shards => {
  const total = get(shards, 'total', 0);
  let primaries = get(shards, 'primaries', 'N/A');
  let replicas = 'N/A';

  // we subtract primaries from total to get replica count, so if we don't know primaries, then
  //  we cannot know replicas (because we'd be showing the wrong number!)
  if (primaries !== 'N/A') {
    replicas = formatNumber(total - primaries, 'int_commas');
    primaries = formatNumber(primaries, 'int_commas');
  }

  return {
    primaries,
    replicas,
  };
};

function getBadgeColorFromLogLevel(level) {
  switch (level) {
    case 'warn':
      return 'warning';
    case 'debug':
      return 'hollow';
    case 'info':
      return 'default';
    case 'error':
      return 'danger';
  }
}

function renderLogs(props) {
  if (!props.logs.enabled) {
    return (
      <EuiDescriptionList>
        <Reason reason={props.logs.reason} />
      </EuiDescriptionList>
    );
  }

  return (
    <EuiDescriptionList type="column">
      {props.logs.types.map((log, index) => (
        <Fragment key={index}>
          <EuiDescriptionListTitle>
            <FormattedMessage
              id="xpack.monitoring.cluster.overview.logsPanel.logTypeTitle"
              defaultMessage="{type}"
              values={{
                type: capitalize(log.type),
              }}
            />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{renderLog(log)}</EuiDescriptionListDescription>
        </Fragment>
      ))}
      {props.logs.types.length === 0 ? (
        <FormattedMessage
          id="xpack.monitoring.cluster.overview.logsPanel.noLogsFound"
          defaultMessage="No logs found."
        />
      ) : null}
    </EuiDescriptionList>
  );
}

const logLevelText = {
  info: i18n.translate('xpack.monitoring.cluster.overview.esPanel.infoLogsTooltipText', {
    defaultMessage: 'The number of information logs',
  }),
  warn: i18n.translate('xpack.monitoring.cluster.overview.esPanel.warnLogsTooltipText', {
    defaultMessage: 'The number of warning logs',
  }),
  debug: i18n.translate('xpack.monitoring.cluster.overview.esPanel.debugLogsTooltipText', {
    defaultMessage: 'The number of debug logs',
  }),
  error: i18n.translate('xpack.monitoring.cluster.overview.esPanel.errorLogsTooltipText', {
    defaultMessage: 'The number of error logs',
  }),
  fatal: i18n.translate('xpack.monitoring.cluster.overview.esPanel.fatalLogsTooltipText', {
    defaultMessage: 'The number of fatal logs',
  }),
  unknown: i18n.translate('xpack.monitoring.cluster.overview.esPanel.unknownLogsTooltipText', {
    defaultMessage: 'Unknown',
  }),
};

function renderLog(log) {
  return (
    <EuiFlexGroup wrap responsive={false} gutterSize="xs">
      {log.levels.map((level, index) => (
        <EuiFlexItem grow={false} key={index}>
          <EuiToolTip position="top" content={logLevelText[level.level] || logLevelText.unknown}>
            <EuiBadge color={getBadgeColorFromLogLevel(level.level)}>
              {formatNumber(level.count, 'int_commas')}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

export function ElasticsearchPanel(props) {
  const clusterStats = props.cluster_stats || {};
  const nodes = clusterStats.nodes;
  const indices = clusterStats.indices;
  const setupMode = props.setupMode;

  const goToElasticsearch = () => props.changeUrl('elasticsearch');
  const goToNodes = () => props.changeUrl('elasticsearch/nodes');
  const goToIndices = () => props.changeUrl('elasticsearch/indices');

  const { primaries, replicas } = calculateShards(get(props, 'cluster_stats.indices.shards', {}));

  const statusIndicator = <HealthStatusIndicator status={clusterStats.status} />;

  const licenseText = (
    <LicenseText license={props.license} showLicenseExpiration={props.showLicenseExpiration} />
  );

  const setupModeData = get(setupMode.data, 'elasticsearch');
  const setupModeTooltip =
    setupMode && setupMode.enabled ? (
      <SetupModeTooltip
        setupModeData={setupModeData}
        productName={ELASTICSEARCH_SYSTEM_ID}
        badgeClickAction={goToNodes}
      />
    ) : null;

  const showMlJobs = () => {
    // if license doesn't support ML, then `ml === null`
    if (props.ml) {
      const gotoURL = '#/elasticsearch/ml_jobs';
      return (
        <>
          <EuiDescriptionListTitle>
            <DisabledIfNoDataAndInSetupModeLink
              setupModeEnabled={setupMode.enabled}
              setupModeData={setupModeData}
              href={gotoURL}
            >
              <FormattedMessage
                id="xpack.monitoring.cluster.overview.esPanel.jobsLabel"
                defaultMessage="Jobs"
              />
            </DisabledIfNoDataAndInSetupModeLink>
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription data-test-subj="esMlJobs">
            <DisabledIfNoDataAndInSetupModeLink
              setupModeEnabled={setupMode.enabled}
              setupModeData={setupModeData}
              href={gotoURL}
            >
              {props.ml.jobs}
            </DisabledIfNoDataAndInSetupModeLink>
          </EuiDescriptionListDescription>
        </>
      );
    }
    return null;
  };

  return (
    <ClusterItemContainer
      {...props}
      statusIndicator={statusIndicator}
      url="elasticsearch"
      title="Elasticsearch"
      extras={licenseText}
    >
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeData}
                  onClick={goToElasticsearch}
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.esPanel.overviewLinkAriaLabel',
                    {
                      defaultMessage: 'Elasticsearch Overview',
                    }
                  )}
                  data-test-subj="esOverview"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.esPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.versionLabel"
                  defaultMessage="Version"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esVersion">
                {props.version ||
                  i18n.translate(
                    'xpack.monitoring.cluster.overview.esPanel.versionNotAvailableDescription',
                    {
                      defaultMessage: 'N/A',
                    }
                  )}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.uptimeLabel"
                  defaultMessage="Uptime"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esUptime">
                {formatNumber(get(nodes, 'jvm.max_uptime_in_millis'), 'time_since')}
              </EuiDescriptionListDescription>
              {showMlJobs()}
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <EuiLink data-test-subj="esNumberOfNodes" onClick={goToNodes}>
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.esPanel.nodesTotalLinkLabel"
                        defaultMessage="Nodes: {nodesTotal}"
                        values={{
                          nodesTotal: formatNumber(get(nodes, 'count.total'), 'int_commas'),
                        }}
                      />
                    </EuiLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              {setupModeTooltip}
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.diskAvailableLabel"
                  defaultMessage="Disk Available"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDiskAvailable">
                <BytesPercentageUsage
                  usedBytes={get(nodes, 'fs.available_in_bytes')}
                  maxBytes={get(nodes, 'fs.total_in_bytes')}
                />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.jvmHeapLabel"
                  defaultMessage="{javaVirtualMachine} Heap"
                  values={{ javaVirtualMachine: 'JVM' }}
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esJvmHeap">
                <BytesPercentageUsage
                  usedBytes={get(nodes, 'jvm.mem.heap_used_in_bytes')}
                  maxBytes={get(nodes, 'jvm.mem.heap_max_in_bytes')}
                />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeData}
                  onClick={goToIndices}
                  data-test-subj="esNumberOfIndices"
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.esPanel.indicesCountLinkAriaLabel',
                    {
                      defaultMessage: 'Elasticsearch Indices: {indicesCount}',
                      values: { indicesCount: formatNumber(get(indices, 'count'), 'int_commas') },
                    }
                  )}
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.esPanel.indicesCountLinkLabel"
                    defaultMessage="Indices: {indicesCount}"
                    values={{ indicesCount: formatNumber(get(indices, 'count'), 'int_commas') }}
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.documentsLabel"
                  defaultMessage="Documents"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDocumentsCount">
                {formatNumber(get(indices, 'docs.count'), 'int_commas')}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.diskUsageLabel"
                  defaultMessage="Disk Usage"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDiskUsage">
                {formatNumber(get(indices, 'store.size_in_bytes'), 'byte')}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.primaryShardsLabel"
                  defaultMessage="Primary Shards"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esPrimaryShards">
                {primaries}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.replicaShardsLabel"
                  defaultMessage="Replica Shards"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esReplicaShards">
                {replicas}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeData}
                  onClick={goToElasticsearch}
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.esPanel.logsLinkAriaLabel',
                    {
                      defaultMessage: 'Elasticsearch Logs',
                    }
                  )}
                  data-test-subj="esLogs"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.esPanel.logsLinkLabel"
                    defaultMessage="Logs"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            {renderLogs(props)}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
