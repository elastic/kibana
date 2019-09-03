/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiText } from '@elastic/eui';
import { get } from 'lodash';
import { MonitorListStatusColumn } from './monitor_list_status_column';
import { Check } from '../../../../common/graphql/types';
import { LocationLink } from './location_link';

interface CheckListProps {
  checks: Check[];
}

export const CheckList = ({ checks }: CheckListProps) => {
  return (
    <EuiFlexGrid columns={3} gutterSize="l" style={{ paddingLeft: '40px' }}>
      {checks.map(check => {
        const location = get<string | null>(check, 'observer.geo.name', null);
        const agentId = get<string>(check, 'agent.id', 'null');
        const key = location + agentId + check.monitor.ip;
        return (
          <Fragment key={key}>
            <EuiFlexItem grow={4}>
              <MonitorListStatusColumn status={check.monitor.status} timestamp={check.timestamp} />
            </EuiFlexItem>
            <EuiFlexItem grow={4}>
              <LocationLink location={location} />
            </EuiFlexItem>
            <EuiFlexItem grow={4}>
              <EuiText color="secondary" size="s">
                {check.monitor.ip}
              </EuiText>
            </EuiFlexItem>
          </Fragment>
        );
      })}
    </EuiFlexGrid>
  );
};
