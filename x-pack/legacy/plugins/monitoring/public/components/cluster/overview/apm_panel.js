/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { get } from 'lodash';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
import { ClusterItemContainer, BytesPercentageUsage, DisabledIfNoDataAndInSetupModeLink } from './helpers';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
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
  EuiFlexGroup,
  EuiToolTip,
  EuiBadge
} from '@elastic/eui';
import { formatTimestampToDuration } from '../../../../common';
import { CALCULATE_DURATION_SINCE } from '../../../../common/constants';

export function ApmPanel(props) {
  const { setupMode } = props;
  const apmsTotal = get(props, 'apms.total') || 0;
  // Do not show if we are not in setup mode
  if (apmsTotal === 0 && !setupMode.enabled) {
    return null;
  }

  const goToApm = () => props.changeUrl('apm');
  const goToInstances = () => props.changeUrl('apm/instances');

  const setupModeApmData = get(setupMode.data, 'apm');
  let setupModeInstancesData = null;
  if (setupMode.enabled && setupMode.data) {
    const migratedNodesCount = Object.values(setupModeApmData.byUuid).filter(node => node.isFullyMigrated).length;
    let totalNodesCount = Object.values(setupModeApmData.byUuid).length;
    if (totalNodesCount === 0 && get(setupMode.data, 'apm.detected.mightExist', false)) {
      totalNodesCount = 1;
    }

    const badgeColor = migratedNodesCount === totalNodesCount
      ? 'secondary'
      : 'danger';

    setupModeInstancesData = (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.monitoring.cluster.overview.apmPanel.setupModeNodesTooltip', {
            defaultMessage: `These numbers indicate how many detected monitored APM servers versus how many ` +
            `detected total APM servers. If there are more detected APM servers than monitored APM servers, click the Nodes ` +
            `link and you will be guided in how to setup monitoring for the missing node.`
          })}
        >
          <EuiBadge color={badgeColor}>
            {migratedNodesCount}/{totalNodesCount}
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }

  return (
    <ClusterItemContainer
      {...props}
      url="apm"
      title={i18n.translate('xpack.monitoring.cluster.overview.apmPanel.apmTitle', {
        defaultMessage: 'APM'
      })}
    >
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeApmData}
                  onClick={goToApm}
                  aria-label={i18n.translate('xpack.monitoring.cluster.overview.apmPanel.overviewLinkAriaLabel', {
                    defaultMessage: 'APM Overview'
                  })}
                  data-test-subj="apmOverview"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.apmPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.apmPanel.processedEventsLabel"
                  defaultMessage="Processed Events"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="apmsTotalEvents">
                {formatMetric(props.totalEvents, '0.[0]a')}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.apmPanel.lastEventLabel"
                  defaultMessage="Last Event"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="apmsBytesSent">
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.apmPanel.lastEventDescription"
                  defaultMessage="{timeOfLastEvent} ago"
                  values={{ timeOfLastEvent: formatTimestampToDuration(+moment(props.timeOfLastEvent), CALCULATE_DURATION_SINCE) }}
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
                      aria-label={i18n.translate(
                        'xpack.monitoring.cluster.overview.apmPanel.instancesTotalLinkAriaLabel',
                        {
                          defaultMessage: 'APM Instances: {apmsTotal}',
                          values: { apmsTotal }
                        }
                      )}
                      data-test-subj="apmListing"
                    >
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.apmPanel.serversTotalLinkLabel"
                        defaultMessage="APM Servers: {apmsTotal}"
                        values={{ apmsTotal: (<span data-test-subj="apmsTotal">{apmsTotal}</span>) }}
                      />
                    </EuiLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              {setupModeInstancesData}
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.apmPanel.memoryUsageLabel"
                  defaultMessage="Memory Usage"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="apmMemoryUsage">
                <BytesPercentageUsage usedBytes={props.memRss} maxBytes={props.memTotal} />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
