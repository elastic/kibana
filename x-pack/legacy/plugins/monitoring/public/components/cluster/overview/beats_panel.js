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
} from '@elastic/eui';
import { ClusterItemContainer } from './helpers';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

export function BeatsPanel(props) {
  if (!get(props, 'beats.total', 0) > 0) {
    return null;
  }

  const goToBeats = () => props.changeUrl('beats');
  const goToInstances = () => props.changeUrl('beats/beats');

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
                <EuiLink
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
                </EuiLink>
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
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToInstances}
                  aria-label={i18n.translate(
                    'xpack.monitoring.cluster.overview.beatsPanel.instancesTotalLinkAriaLabel',
                    {
                      defaultMessage: 'Beats Instances: {beatsTotal}',
                      values: { beatsTotal: props.beats.total }
                    }
                  )}
                  data-test-subj="beatsListing"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.beatsPanel.beatsTotalLinkLabel"
                    defaultMessage="Beats: {beatsTotal}"
                    values={{ beatsTotal: (<span data-test-subj="beatsTotal">{props.beats.total}</span>) }}
                  />
                </EuiLink>
              </h3>
            </EuiTitle>
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
