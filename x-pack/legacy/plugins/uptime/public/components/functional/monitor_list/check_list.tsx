/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React, { Fragment } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiText } from '@elastic/eui';
import { MonitorListStatusColumn } from '../monitor_list_status_column';
import { Check } from '../../../../common/graphql/types';

interface CheckListProps {
  checks: Check[];
}

export const CheckList = ({ checks }: CheckListProps) => (
  <EuiFlexGrid columns={3} style={{ paddingLeft: '40px' }}>
    {checks.map(check => {
      const momentTimestamp = moment(parseInt(check.timestamp, 10));
      return (
        <Fragment key={check.observer.geo.name + check.agent.id + check.monitor.ip}>
          <EuiFlexItem>
            <MonitorListStatusColumn
              absoluteTime={momentTimestamp.toLocaleString()}
              relativeTime={momentTimestamp.fromNow()}
              status={check.monitor.status}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">{check.observer.geo.name}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText color="secondary" size="s">
              {check.monitor.ip}
            </EuiText>
          </EuiFlexItem>
        </Fragment>
      );
    })}
  </EuiFlexGrid>
);
