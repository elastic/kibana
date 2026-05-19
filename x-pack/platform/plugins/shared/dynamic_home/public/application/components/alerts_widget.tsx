/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { AlertStats } from '../../../server/routes/space_context';

interface AlertsWidgetProps {
  alertStats: AlertStats;
}

export const AlertsWidget: React.FC<AlertsWidgetProps> = ({ alertStats }) => {
  const { firing, ok, error, total } = alertStats;

  return (
    <EuiPanel hasBorder style={{ height: '100%' }}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="bell" size="m" color={firing > 0 ? 'danger' : 'success'} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Alerting</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup justifyContent="spaceAround" gutterSize="s">
        <EuiFlexItem>
          <EuiStat
            title={String(firing)}
            description="Firing"
            titleColor="danger"
            titleSize="m"
            textAlign="center"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={String(ok)}
            description="OK"
            titleColor="success"
            titleSize="m"
            textAlign="center"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={String(error)}
            description="Error"
            titleColor="warning"
            titleSize="m"
            textAlign="center"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiText size="xs" color="subdued" textAlign="center">
        <p>{total} rule{total !== 1 ? 's' : ''} total</p>
      </EuiText>

      <EuiSpacer size="s" />

      <EuiText size="xs" textAlign="center">
        <EuiLink href="/app/management/insightsAndAlerting/triggersActions/rules" target="_self">
          View all rules →
        </EuiLink>
      </EuiText>
    </EuiPanel>
  );
};
