/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import chrome from '../../np_imports/ui/chrome';
import { capitalize, get } from 'lodash';
import { formatDateTimeLocal } from '../../../common/formatting';
import { formatTimestampToDuration } from '../../../common';
import {
  CALCULATE_DURATION_SINCE,
  EUI_SORT_DESCENDING,
  ALERT_TYPE_LICENSE_EXPIRATION,
  ALERT_TYPE_CLUSTER_STATE,
  ALERT_GUARD_RAIL_TYPE_CPU_USAGE,
} from '../../../common/constants';
import { mapSeverity } from './map_severity';
import { FormattedAlert } from 'plugins/monitoring/components/cluster_alerts/formatted_alert';
import { EuiMonitoringTable } from 'plugins/monitoring/components/table';
import { EuiHealth, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { replaceTokens } from '../../lib/alerts';

const linkToCategories = {
  'elasticsearch/nodes': 'Elasticsearch Nodes',
  'elasticsearch/indices': 'Elasticsearch Indices',
  'kibana/instances': 'Kibana Instances',
  'logstash/instances': 'Logstash Nodes',
  [ALERT_TYPE_LICENSE_EXPIRATION]: 'License expiration',
  [ALERT_TYPE_CLUSTER_STATE]: 'Cluster state',
  [ALERT_GUARD_RAIL_TYPE_CPU_USAGE]: 'Elasticsearch Nodes',
};
const getColumns = (kbnUrl, scope, timezone) => [
  {
    name: i18n.translate('xpack.monitoring.alerts.statusColumnTitle', {
      defaultMessage: 'Status',
    }),
    field: 'status',
    sortable: true,
    render: severity => {
      const severityIconDefaults = {
        title: i18n.translate('xpack.monitoring.alerts.severityTitle.unknown', {
          defaultMessage: 'Unknown',
        }),
        color: 'subdued',
        value: i18n.translate('xpack.monitoring.alerts.severityValue.unknown', {
          defaultMessage: 'N/A',
        }),
      };
      const severityIcon = { ...severityIconDefaults, ...mapSeverity(severity) };

      return (
        <EuiToolTip content={severityIcon.title} position="bottom">
          <EuiHealth
            color={severityIcon.color}
            data-test-subj="alertIcon"
            aria-label={severityIcon.title}
          >
            {capitalize(severityIcon.value)}
          </EuiHealth>
        </EuiToolTip>
      );
    },
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.resolvedColumnTitle', {
      defaultMessage: 'Resolved',
    }),
    field: 'resolved_timestamp',
    sortable: true,
    render: resolvedTimestamp => {
      const notResolvedLabel = i18n.translate('xpack.monitoring.alerts.notResolvedDescription', {
        defaultMessage: 'Not Resolved',
      });

      const resolution = {
        icon: null,
        text: notResolvedLabel,
      };

      if (resolvedTimestamp) {
        resolution.text = i18n.translate('xpack.monitoring.alerts.resolvedAgoDescription', {
          defaultMessage: '{duration} ago',
          values: {
            duration: formatTimestampToDuration(resolvedTimestamp, CALCULATE_DURATION_SINCE),
          },
        });
      } else {
        resolution.icon = <EuiIcon type="alert" size="m" aria-label={notResolvedLabel} />;
      }

      return (
        <span>
          {resolution.icon} {resolution.text}
        </span>
      );
    },
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.messageColumnTitle', {
      defaultMessage: 'Message',
    }),
    field: 'message',
    sortable: true,
    render: (_message, alert) => {
      let message = _message;
      if (alert.type) {
        message = replaceTokens(alert);
      }
      return (
        <FormattedAlert
          prefix={alert.prefix}
          suffix={alert.suffix}
          message={message}
          metadata={alert.metadata}
          changeUrl={target => {
            scope.$evalAsync(() => {
              kbnUrl.changePath(target);
            });
          }}
        />
      );
    },
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.categoryColumnTitle', {
      defaultMessage: 'Category',
    }),
    field: 'category',
    sortable: true,
    render: link =>
      linkToCategories[link]
        ? linkToCategories[link]
        : i18n.translate('xpack.monitoring.alerts.categoryColumn.generalLabel', {
            defaultMessage: 'General',
          }),
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.lastCheckedColumnTitle', {
      defaultMessage: 'Last Checked',
    }),
    field: 'update_timestamp',
    sortable: true,
    render: timestamp => formatDateTimeLocal(timestamp, timezone),
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.triggeredColumnTitle', {
      defaultMessage: 'Triggered',
    }),
    field: 'timestamp',
    sortable: true,
    render: (_timestamp, alert) => {
      const timestamp = alert.type ? alert.triggeredMS : _timestamp;
      return i18n.translate('xpack.monitoring.alerts.triggeredColumnValue', {
        defaultMessage: '{timestamp} ago',
        values: {
          timestamp: formatTimestampToDuration(timestamp, CALCULATE_DURATION_SINCE),
        },
      });
    },
  },
];

export const Alerts = ({ alerts, angular, sorting, pagination, onTableChange }) => {
  const alertsFlattened = alerts.map(alert => ({
    ...alert,
    status: get(alert, 'metadata.severity', get(alert, 'severity', 0)),
    category: get(alert, 'metadata.link', get(alert, 'type', null)),
  }));

  const injector = chrome.dangerouslyGetActiveInjector();
  const timezone = injector.get('config').get('dateFormat:tz');

  return (
    <EuiMonitoringTable
      className="alertsTable"
      rows={alertsFlattened}
      columns={getColumns(angular.kbnUrl, angular.scope, timezone)}
      sorting={{
        ...sorting,
        sort: {
          ...sorting.sort,
          field: 'status',
          direction: EUI_SORT_DESCENDING,
        },
      }}
      pagination={pagination}
      search={{
        box: {
          incremental: true,
          placeholder: i18n.translate('xpack.monitoring.alerts.filterAlertsPlaceholder', {
            defaultMessage: 'Filter Alerts…',
          }),
        },
      }}
      onTableChange={onTableChange}
      executeQueryOptions={{
        defaultFields: ['message', 'category'],
      }}
    />
  );
};
