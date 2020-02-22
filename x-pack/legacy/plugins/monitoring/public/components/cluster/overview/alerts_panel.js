/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import moment from 'moment-timezone';
import chrome from '../../../np_imports/ui/chrome';
import { FormattedAlert } from 'plugins/monitoring/components/alerts/formatted_alert';
import { mapSeverity } from 'plugins/monitoring/components/alerts/map_severity';
import { formatTimestampToDuration } from '../../../../common/format_timestamp_to_duration';
import {
  CALCULATE_DURATION_SINCE,
  KIBANA_ALERTING_ENABLED,
  ALERT_TYPE_LICENSE_EXPIRATION,
  CALCULATE_DURATION_UNTIL,
} from '../../../../common/constants';
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
  EuiLink,
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

    const injector = chrome.dangerouslyGetActiveInjector();
    const timezone = injector.get('config').get('dateFormat:tz');

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
                updateDateTime: formatDateTimeLocal(item.update_timestamp, timezone),
                duration: formatTimestampToDuration(item.timestamp, CALCULATE_DURATION_SINCE),
              }}
            />
          </p>
        </EuiText>
      </EuiCallOut>
    );
  }

  const alertsList = KIBANA_ALERTING_ENABLED
    ? alerts.map((alert, idx) => {
        const callOutProps = mapSeverity(alert.severity);
        let message = alert.message
          // scan message prefix and replace relative times
          // \w: Matches any alphanumeric character from the basic Latin alphabet, including the underscore. Equivalent to [A-Za-z0-9_].
          .replace(
            '#relative',
            formatTimestampToDuration(alert.expirationTime, CALCULATE_DURATION_UNTIL)
          )
          .replace('#absolute', moment.tz(alert.expirationTime, moment.tz.guess()).format('LLL z'));

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
      })
    : alerts.map((item, index) => (
        <TopAlertItem item={item} key={`top-alert-item-${index}`} index={index} />
      ));

  return (
    <div data-test-subj="clusterAlertsContainer">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.monitoring.cluster.overview.alertsPanel.topClusterTitle"
                defaultMessage="Top cluster alerts"
              />
            </h2>
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
