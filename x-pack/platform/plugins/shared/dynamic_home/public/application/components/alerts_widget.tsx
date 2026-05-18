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
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

interface AlertsWidgetProps {
  totalRules: number;
}

export const AlertsWidget: React.FC<AlertsWidgetProps> = ({ totalRules }) => {
  const { euiTheme } = useEuiTheme();

  const statColor = totalRules === 0 ? euiTheme.colors.success : euiTheme.colors.warning;

  const statStyle = css`
    .euiStat__title {
      color: ${statColor};
      font-size: ${euiTheme.size.xxl};
      font-weight: ${euiTheme.font.weight.bold};
    }
  `;

  return (
    <EuiPanel hasBorder style={{ height: '100%' }}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="bell" size="m" color={totalRules > 0 ? 'warning' : 'success'} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Alerting</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      <div css={statStyle}>
        <EuiStat
          title={String(totalRules)}
          description="Total rules configured"
          titleSize="l"
          textAlign="center"
        />
      </div>

      <EuiSpacer size="m" />

      <EuiText size="xs" color="subdued" textAlign="center">
        <p>
          {totalRules === 0
            ? 'No alerting rules configured yet.'
            : `${totalRules} rule${totalRules !== 1 ? 's' : ''} are monitoring your data.`}
        </p>
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
