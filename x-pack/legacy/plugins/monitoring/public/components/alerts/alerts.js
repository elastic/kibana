/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { capitalize } from 'lodash';
import { formatDateTimeLocal } from '../../../common/formatting';
import { formatTimestampToDuration } from '../../../common';
import { CALCULATE_DURATION_SINCE, EUI_SORT_DESCENDING } from '../../../common/constants';
import { mapSeverity } from './map_severity';
import { FormattedAlert } from 'plugins/monitoring/components/alerts/formatted_alert';
import { EuiMonitoringTable } from 'plugins/monitoring/components/table';
import { EuiHealth, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const linkToCategories = {
  'elasticsearch/nodes': 'Elasticsearch Nodes',
  'elasticsearch/indices': 'Elasticsearch Indices',
  'kibana/instances': 'Kibana Instances',
  'logstash/instances': 'Logstash Nodes',
};
const getColumns = (kbnUrl, scope) => [
  {
    name: i18n.translate('xpack.monitoring.alerts.statusColumnTitle', {
      defaultMessage: 'Status',
    }),
    field: 'status',
    sortable: true,
    render: severity => {
      const severityIcon = mapSeverity(severity);

      if (!severityIcon || !severityIcon.title) {
        return null;
      }

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
    render: (message, alert) => (
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
    ),
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
    render: timestamp => formatDateTimeLocal(timestamp),
  },
  {
    name: i18n.translate('xpack.monitoring.alerts.triggeredColumnTitle', {
      defaultMessage: 'Triggered',
    }),
    field: 'timestamp',
    sortable: true,
    render: timestamp =>
      i18n.translate('xpack.monitoring.alerts.triggeredColumnValue', {
        defaultMessage: '{timestamp} ago',
        values: {
          timestamp: formatTimestampToDuration(timestamp, CALCULATE_DURATION_SINCE),
        },
      }),
  },
];

export const Alerts = ({ alerts, angular, sorting, pagination, onTableChange }) => {
  const alertsFlattened = alerts.map(alert => ({
    ...alert,
    status: alert.metadata.severity,
    category: alert.metadata.link,
  }));

  return (
    <EuiMonitoringTable
      className="alertsTable"
      rows={alertsFlattened}
      columns={getColumns(angular.kbnUrl, angular.scope)}
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
