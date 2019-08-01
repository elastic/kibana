/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
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
import { ClusterItemContainer, DisabledIfNoDataAndInSetupModeLink } from './helpers';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

export function BeatsPanel(props) {
  const { setupMode } = props;
  const beatsTotal = get(props, 'beats.total') || 0;
  // Do not show if we are not in setup mode
  if (beatsTotal === 0 && !setupMode.enabled) {
    return null;
  }

  const goToBeats = () => props.changeUrl('beats');
  const goToInstances = () => props.changeUrl('beats/beats');

  const setupModeBeatsData = get(setupMode.data, 'beats');
  let setupModeInstancesData = null;
  if (setupMode.enabled && setupMode.data) {
    const migratedNodesCount = Object.values(setupModeBeatsData.byUuid).filter(node => node.isFullyMigrated).length;
    let totalNodesCount = Object.values(setupModeBeatsData.byUuid).length;
    if (totalNodesCount === 0 && get(setupMode.data, 'beats.detected.mightExist', false)) {
      totalNodesCount = 1;
    }

    const badgeColor = migratedNodesCount === totalNodesCount
      ? 'secondary'
      : 'danger';

    setupModeInstancesData = (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.monitoring.cluster.overview.beatsPanel.setupModeNodesTooltip', {
            defaultMessage: `These numbers indicate how many detected monitored Beats versus how many ` +
            `detected total Beats. If there are more detected Beats than monitored Beats, click the Nodes ` +
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

  const beatTypes = props.beats.types.map((beat, index) => {
    return [
      <EuiDescriptionListTitle
        key={`beat-types-type-${index}`}
        data-test-subj="beatTypeCount"
        data-test-beat-type-count={beat.type + ':' + beat.count}
      >
        {beat.type}
      </EuiDescriptionListTitle>,
      <EuiDescriptionListDescription
        key={`beat-types-count-${index}`}
      >
        {beat.count}
      </EuiDescriptionListDescription>
    ];
  });

  return (
    <ClusterItemContainer
      {...props}
      url="beats"
      title={i18n.translate('xpack.monitoring.cluster.overview.beatsPanel.beatsTitle', {
        defaultMessage: 'Beats'
      })}
    >
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <DisabledIfNoDataAndInSetupModeLink
                  setupModeEnabled={setupMode.enabled}
                  setupModeData={setupModeBeatsData}
                  onClick={goToBeats}
                  aria-label={i18n.translate('xpack.monitoring.cluster.overview.beatsPanel.overviewLinkAriaLabel', {
                    defaultMessage: 'Beats Overview'
                  })}
                  data-test-subj="beatsOverview"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.beatsPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </DisabledIfNoDataAndInSetupModeLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.beatsPanel.totalEventsLabel"
                  defaultMessage="Total Events"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="beatsTotalEvents">
                {formatMetric(props.totalEvents, '0.[0]a')}
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.beatsPanel.bytesSentLabel"
                  defaultMessage="Bytes Sent"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="beatsBytesSent">
                {formatMetric(props.bytesSent, 'byte')}
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
                        'xpack.monitoring.cluster.overview.beatsPanel.instancesTotalLinkAriaLabel',
                        {
                          defaultMessage: 'Beats Instances: {beatsTotal}',
                          values: { beatsTotal }
                        }
                      )}
                      data-test-subj="beatsListing"
                    >
                      <FormattedMessage
                        id="xpack.monitoring.cluster.overview.beatsPanel.beatsTotalLinkLabel"
                        defaultMessage="Beats: {beatsTotal}"
                        values={{ beatsTotal: (<span data-test-subj="beatsTotal">{beatsTotal}</span>) }}
                      />
                    </EuiLink>
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              {setupModeInstancesData}
            </EuiFlexGroup>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              {beatTypes}
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
