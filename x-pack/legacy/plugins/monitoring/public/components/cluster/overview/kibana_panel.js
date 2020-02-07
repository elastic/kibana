/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { formatNumber } from 'plugins/monitoring/lib/format_number';
import {
  ClusterItemContainer,
  HealthStatusIndicator,
  BytesPercentageUsage,
  DisabledIfNoDataAndInSetupModeLink,
} from './helpers';
import { get } from 'lodash';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiPanel,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { SetupModeTooltip } from '../../setup_mode/tooltip';
import { KIBANA_SYSTEM_ID } from '../../../../common/constants';

export function KibanaPanel(props) {
  const setupMode = props.setupMode;
  const showDetectedKibanas =
    setupMode.enabled && get(setupMode.data, 'kibana.detected.doesExist', false);
  if (!props.count && !showDetectedKibanas) {
    return null;
  }

  const statusIndicator = <HealthStatusIndicator status={props.status} />;

  const goToKibana = () => props.changeUrl('kibana');
  const goToInstances = () => props.changeUrl('kibana/instances');

  const setupModeData = get(setupMode.data, 'kibana');
  const setupModeTooltip =
    setupMode && setupMode.enabled ? (
      <SetupModeTooltip
        setupModeData={setupModeData}
        productName={KIBANA_SYSTEM_ID}
        badgeClickAction={goToInstances}
      />
    ) : null;

  return (
    <ClusterItemContainer
      {...props}
      statusIndicator={statusIndicator}
      url="kibana"
      title={i18n.translate('xpack.monitoring.cluster.overview.kibanaPanel.kibanaTitle', {
        defaultMessage: 'Kibana',
      })}
    >
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeData}
                  onClick={goToKibana}
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.kibanaPanel.overviewLinkAriaLabel',
                    {
                      defaultMessage: 'Kibana Overview',
                    }
                  )}
                  data-test-subj="kbnOverview"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.kibanaPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList
              type="column"
              data-test-subj="kibana_overview"
              data-overview-status={props.status}
            >
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.kibanaPanel.requestsLabel"
                  defaultMessage="Requests"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="kbnRequests">
                {props.requests_total}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.kibanaPanel.maxResponseTimeLabel"
                  defaultMessage="Max. Response Time"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="kbnMaxResponseTime">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.kibanaPanel.maxResponseTimeDescription"
                  defaultMessage="{maxTime} ms"
                  values={{ maxTime: props.response_time_max }}
                />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3>
                    <EuiLink
                      onClick={goToInstances}
                      data-test-subj="kbnInstances"
                      aria-label={i18n.translate(
                        'xpack.monitoring.cluster.overview.kibanaPanel.instancesCountLinkAriaLabel',
                        {
                          defaultMessage: 'Kibana Instances: {instancesCount}',
                          values: { instancesCount: props.count },
                        }
                      )}
                    >
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.kibanaPanel.instancesCountLinkLabel"
                        defaultMessage="Instances: {instancesCount}"
                        values={{
                          instancesCount: (
                            <span data-test-subj="number_of_kibana_instances">{props.count}</span>
                          ),
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
                  id="xpack.monitoring.cluster.overview.kibanaPanel.connectionsLabel"
                  defaultMessage="Connections"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="kbnConnections">
                {formatNumber(props.concurrent_connections, 'int_commas')}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.kibanaPanel.memoryUsageLabel"
                  defaultMessage="Memory Usage"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="kbnMemoryUsage">
                <BytesPercentageUsage usedBytes={props.memory_size} maxBytes={props.memory_limit} />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
