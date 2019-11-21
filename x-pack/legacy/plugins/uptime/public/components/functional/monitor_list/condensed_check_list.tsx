/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiHealth,
  EuiToolTip,
  EuiBadge,
  EuiFlexGroup,
} from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { CondensedCheck, CondensedCheckStatus } from './types';
import { MonitorListStatusColumn } from './monitor_list_status_column';
import { LocationLink } from './location_link';

const getBadgeColor = (status: string, successColor: string, dangerColor: string) => {
  switch (status) {
    case 'up':
      return successColor;
    case 'down':
      return dangerColor;
    case 'mixed':
      return 'secondary';
    default:
      return undefined;
  }
};

const getHealthColor = (dangerColor: string, status: string, successColor: string) => {
  switch (status) {
    case 'up':
      return successColor;
    case 'down':
      return dangerColor;
    default:
      return 'primary';
  }
};

interface CondensedCheckListProps {
  condensedChecks: CondensedCheck[];
  successColor: string;
  dangerColor: string;
}

export const CondensedCheckList = ({
  condensedChecks,
  dangerColor,
  successColor,
}: CondensedCheckListProps) => (
  <EuiFlexGrid columns={3} style={{ paddingLeft: '40px' }}>
    {condensedChecks.map(({ childStatuses, location, status, timestamp }: CondensedCheck) => (
      <React.Fragment key={location || 'null'}>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem>
              <MonitorListStatusColumn status={status} timestamp={timestamp} />
            </EuiFlexItem>
            <EuiFlexItem>
              <LocationLink location={location} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="right"
            title="Check statuses"
            content={childStatuses.map(
              ({ status: checkStatus, ip, timestamp: condensedTimestamp }: CondensedCheckStatus) =>
                ip ? (
                  <EuiFlexGroup key={ip}>
                    <EuiFlexItem>
                      <EuiHealth color={getHealthColor(successColor, checkStatus, dangerColor)} />
                    </EuiFlexItem>
                    <EuiFlexItem>{ip}</EuiFlexItem>
                    <EuiFlexItem>{moment(parseInt(condensedTimestamp, 10)).fromNow()}</EuiFlexItem>
                  </EuiFlexGroup>
                ) : null
            )}
          >
            <EuiBadge
              color={getBadgeColor(status, successColor, dangerColor)}
            >{`${childStatuses.length} checks`}</EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      </React.Fragment>
    ))}
  </EuiFlexGrid>
);
