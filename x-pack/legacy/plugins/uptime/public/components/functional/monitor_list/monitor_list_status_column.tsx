/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHealth, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { parseTimestamp } from './parse_timestamp';

interface MonitorListStatusColumnProps {
  status: string;
  timestamp: string;
}

const getHealthColor = (status: string): string => {
  switch (status) {
    case 'up':
      return 'success';
    case 'down':
      return 'danger';
    case 'mixed':
      return 'warning';
    default:
      return '';
  }
};

const getHealthMessage = (status: string): string | null => {
  switch (status) {
    case 'up':
      return i18n.translate('xpack.uptime.monitorList.statusColumn.upLabel', {
        defaultMessage: 'Up',
      });
    case 'down':
      return i18n.translate('xpack.uptime.monitorList.statusColumn.downLabel', {
        defaultMessage: 'Down',
      });
    case 'mixed':
      return i18n.translate('xpack.uptime.monitorList.statusColumn.mixedLabel', {
        defaultMessage: 'Mixed',
      });
    default:
      return null;
  }
};

export const MonitorListStatusColumn = ({
  status,
  timestamp: tsString,
}: MonitorListStatusColumnProps) => {
  const timestamp = parseTimestamp(tsString);
  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem>
        <EuiHealth color={getHealthColor(status)} style={{ display: 'block' }}>
          {getHealthMessage(status)}
        </EuiHealth>
        <EuiToolTip
          content={
            <EuiText color="ghost" size="xs">
              {timestamp.toLocaleString()}
            </EuiText>
          }
        >
          <EuiText size="xs" color="subdued">
            {timestamp.fromNow()}
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
