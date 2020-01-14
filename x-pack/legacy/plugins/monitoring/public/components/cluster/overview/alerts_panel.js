/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedAlert } from 'plugins/monitoring/components/alerts/formatted_alert';
import { mapSeverity } from 'plugins/monitoring/components/alerts/map_severity';
import { formatTimestampToDuration } from '../../../../common/format_timestamp_to_duration';
import { CALCULATE_DURATION_SINCE } from '../../../../common/constants';
import { formatDateTimeLocal } from '../../../../common/formatting';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiText,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';

export function AlertsPanel({ alerts, changeUrl }) {
  const goToAlerts = () => changeUrl('/alerts');

  if (!alerts || !alerts.length) {
    // no-op
    return null;
  }

  // enclosed component for accessing changeUrl
  function TopAlertItem({ item, index }) {
    const severityIcon = mapSeverity(item.metadata.severity);

    if (item.resolved_timestamp) {
      severityIcon.title = i18n.translate(
        'xpack.monitoring.cluster.overview.alertsPanel.severityIconTitle',
        {
          defaultMessage: '{severityIconTitle} (resolved {time} ago)',
          values: {
            severityIconTitle: severityIcon.title,
            time: formatTimestampToDuration(item.resolved_timestamp, CALCULATE_DURATION_SINCE),
          },
        }
      );
      severityIcon.color = 'success';
      severityIcon.iconType = 'check';
    }

    return (
      <EuiCallOut
        key={`alert-item-${index}`}
        data-test-subj="topAlertItem"
        className="kuiVerticalRhythm"
        iconType={severityIcon.iconType}
        color={severityIcon.color}
        title={severityIcon.title}
      >
        <FormattedAlert
          prefix={item.prefix}
          suffix={item.suffix}
          message={item.message}
          metadata={item.metadata}
          changeUrl={changeUrl}
        />
        <EuiText size="xs">
          <p data-test-subj="alertMeta" className="monCallout--meta">
            <FormattedMessage
              id="xpack.monitoring.cluster.overview.alertsPanel.lastCheckedTimeText"
              defaultMessage="Last checked {updateDateTime} (triggered {duration} ago)"
              values={{
                updateDateTime: formatDateTimeLocal(item.update_timestamp),
                duration: formatTimestampToDuration(item.timestamp, CALCULATE_DURATION_SINCE),
              }}
            />
          </p>
        </EuiText>
      </EuiCallOut>
    );
  }

  const topAlertItems = alerts.map((item, index) => (
    <TopAlertItem item={item} key={`top-alert-item-${index}`} index={index} />
  ));

  return (
    <div data-test-subj="clusterAlertsContainer">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.monitoring.cluster.overview.alertsPanel.topClusterTitle"
                defaultMessage="Top cluster alerts"
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={goToAlerts} data-test-subj="viewAllAlerts">
            <FormattedMessage
              id="xpack.monitoring.cluster.overview.alertsPanel.viewAllButtonLabel"
              defaultMessage="View all alerts"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {topAlertItems}
      <EuiSpacer size="xxl" />
    </div>
  );
}
