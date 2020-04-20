/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiBadge } from '@elastic/eui';

// @ts-ignore
import { EuiMonitoringTable } from '../table';

interface AlertStatus {
  type: string;
  exists: boolean;
  stateless: boolean;
  firing: boolean;
  state: any;
}

interface AlertsProps {
  alerts: AlertStatus[];
}

export const Alerts: React.FC<AlertsProps> = (props: AlertsProps) => {
  const { alerts } = props;

  const COLUMNS = [
    {
      name: i18n.translate('xpack.monitoring.alerts.listing.column.type', {
        defaultMessage: 'Type',
      }),
      field: 'type',
      render: (field: string) => <EuiLink href={`#/alert/${field}`}>{field}</EuiLink>,
    },
    {
      name: i18n.translate('xpack.monitoring.alerts.listing.column.state', {
        defaultMessage: 'State',
      }),
      field: 'firing',
      render: (firing: boolean) => {
        if (firing) {
          return (
            <EuiBadge iconType="securitySignalDetected" color="danger">
              Firing
            </EuiBadge>
          );
        }
        return (
          <EuiBadge iconType="securitySignalResolved" color="secondary">
            Clear
          </EuiBadge>
        );
      },
    },
  ];

  return <EuiMonitoringTable rows={alerts} columns={COLUMNS} />;
};
