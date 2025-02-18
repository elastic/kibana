/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get } from 'lodash';
import { formatNumber } from '../../../lib/format_number';
import {
  BytesPercentageUsage,
  ClusterItemContainer,
  DisabledIfNoDataAndInSetupModeLink,
} from './helpers';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
  EuiFlexGroup,
} from '@elastic/eui';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';

export function EnterpriseSearchPanel(props) {
  const { setupMode } = props;
  const setupModeData = get(setupMode.data, 'enterprise_search');
  const nodesCount = props.stats.totalInstances || 0;

  // Do not show if we are not in setup mode
  if (!nodesCount && !setupMode.enabled) {
    return null;
  }

  return (
    <ClusterItemContainer
      {...props}
      url="enterprise_search"
      title={i18n.translate('xpack.monitoring.cluster.overview.entSearchPanel.entSearchTitle', {
        defaultMessage: 'Enterprise Search',
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
                  href={getSafeForExternalLink('#/enterprise_search')}
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.entSearchPanel.overviewLinkAriaLabel',
                    {
                      defaultMessage: 'Enterprise Search Overview',
                    }
                  )}
                  data-test-subj="entSearchOverview"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.entSearchPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.entSearchPanel.versionLabel"
                  defaultMessage="Version"
                />
              </EuiDescriptionListTitle>

              <EuiDescriptionListDescription data-test-subj="entSearchVersion">
                {props.stats.versions[0] ||
                  i18n.translate(
                    'xpack.monitoring.cluster.overview.entSearchPanel.versionNotAvailableDescription',
                    {
                      defaultMessage: 'N/A',
                    }
                  )}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.entSearchPanel.appSearchEngines"
                  defaultMessage="Engines"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="appSearchEngines">
                {props.stats.appSearchEngines}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.entSearchPanel.workplaceSearchOrgSources"
                  defaultMessage="Org Sources"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="workplaceSearchOrgSources">
                {props.stats.workplaceSearchOrgSources}
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.entSearchPanel.workplaceSearchPrivateSources"
                  defaultMessage="Private Sources"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="workplaceSearchPrivateSources">
                {props.stats.workplaceSearchPrivateSources}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiTitle size="s">
                  <h3 data-test-subj="entSearchTotalNodes">
                    <FormattedMessage
                      id="xpack.monitoring.cluster.overview.entSearchPanel.nodesTotalLinkLabel"
                      defaultMessage="Nodes: {nodesTotal}"
                      values={{
                        nodesTotal: formatNumber(nodesCount, 'int_commas'),
                      }}
                    />
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.entSearchPanel.memoryUsageLabel"
                  defaultMessage="Memory Usage"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="entSearchMemoryUsage">
                <BytesPercentageUsage
                  usedBytes={props.stats.memUsed}
                  maxBytes={props.stats.memTotal}
                />
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle className="eui-textBreakWord">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.entSearchPanel.uptimeLabel"
                  defaultMessage="Uptime"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="entSearchUptime">
                {formatNumber(props.stats.uptime, 'time_since')}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
