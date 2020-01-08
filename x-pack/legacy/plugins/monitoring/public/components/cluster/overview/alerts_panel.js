/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  ALERT_TYPE_LICENSE_EXPIRATION,
  CALCULATE_DURATION_SINCE,
} from '../../../../common/constants';
import { mapSeverity } from '../../alerts/map_severity';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiSpacer,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { formatTimestampToDuration } from '../../../../common';

export function AlertsPanel({ alerts, changeUrl }) {
  const goToAlerts = () => changeUrl('/alerts');

  if (!alerts || !alerts.length) {
    // no-op
    return null;
  }

  const alertsList = alerts.map((alert, idx) => {
    const callOutProps = mapSeverity(alert.severity);
    let message = alert.message;

    if (!alert.isFiring) {
      callOutProps.title = i18n.translate(
        'xpack.monitoring.cluster.overview.alertsPanel.severityIconTitle',
        {
          defaultMessage: '{severityIconTitle} (resolved {time} ago)',
          values: {
            severityIconTitle: callOutProps.title,
            time: formatTimestampToDuration(alert.resolvedMS, CALCULATE_DURATION_SINCE),
          },
        }
      );
      callOutProps.color = 'success';
      callOutProps.iconType = 'check';
    } else {
      if (alert.type === ALERT_TYPE_LICENSE_EXPIRATION) {
        message = (
          <Fragment>
            {message}
            &nbsp;
            <EuiLink href="#license">Please update your license</EuiLink>
          </Fragment>
        );
      }
    }

    return (
      <EuiCallOut key={idx} {...callOutProps}>
        <p>{message}</p>
      </EuiCallOut>
    );
  });

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
      {alertsList}
      <EuiSpacer size="xxl" />
    </div>
  );
}
