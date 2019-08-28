/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mapSeverity } from 'plugins/monitoring/components/alerts/map_severity';
import { EuiHealth, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

const HIGH_SEVERITY = 2000;
const MEDIUM_SEVERITY = 1000;
const LOW_SEVERITY = 0;

export function AlertsIndicator({ alerts }) {
  if (alerts && alerts.count > 0) {
    const severity = (() => {
      if (alerts.high > 0) { return HIGH_SEVERITY; }
      if (alerts.medium > 0) { return MEDIUM_SEVERITY; }
      return LOW_SEVERITY;
    })();
    const severityIcon = mapSeverity(severity);
    const tooltipText = (() => {
      switch (severity) {
        case HIGH_SEVERITY:
          return i18n.translate('xpack.monitoring.cluster.listing.alertsInticator.highSeverityTooltip', {
            defaultMessage: 'There are some critical cluster issues that require your immediate attention!'
          });
        case MEDIUM_SEVERITY:
          return i18n.translate(
            'xpack.monitoring.cluster.listing.alertsInticator.mediumSeverityTooltip',
            {
              defaultMessage: 'There are some issues that might have impact on your cluster.'
            }
          );
        default:
          // might never show
          return i18n.translate('xpack.monitoring.cluster.listing.alertsInticator.lowSeverityTooltip', {
            defaultMessage: 'There are some low-severity cluster issues'
          });
      }
    })();

    return (
      <EuiToolTip content={tooltipText} position="bottom" trigger="hover">
        <EuiHealth color={severityIcon.color} data-test-subj="alertIcon">
          <FormattedMessage
            id="xpack.monitoring.cluster.listing.alertsInticator.alertsTooltip"
            defaultMessage="Alerts"
          />
        </EuiHealth>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip
      content={i18n.translate('xpack.monitoring.cluster.listing.alertsInticator.clearStatusTooltip', {
        defaultMessage: 'Cluster status is clear!'
      })}
      position="bottom"
    >
      <EuiHealth color="success" data-test-subj="alertIcon">
        <FormattedMessage
          id="xpack.monitoring.cluster.listing.alertsInticator.clearTooltip"
          defaultMessage="Clear"
        />
      </EuiHealth>
    </EuiToolTip>
  );
}
