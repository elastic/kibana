/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';

// Shaded header band (icon + title + optional "N services"), bled to the
// panel's edges via negative margins so the parent EuiPanel keeps its normal
// paddingSize="l" — parent must set `style={{ overflow: 'hidden' }}` so the
// square-cornered tint clips to the panel's rounded corners.
export const CardHeader: React.FunctionComponent<{
  iconType: string;
  title: string;
  servicesCount?: number;
}> = ({ iconType, title, servicesCount }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      style={{
        margin: `-${euiTheme.size.l} -${euiTheme.size.l} 0`,
        padding: euiTheme.size.l,
        background: euiTheme.colors.backgroundBaseSubdued,
        borderBottom: euiTheme.border.thin,
      }}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={iconType} size="m" />
        </EuiFlexItem>
        {/* grow={false} — like Step 3's AccordionCard header — so the count
            sits right next to the title instead of being pushed to the
            row's far right edge. */}
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {servicesCount !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {`${servicesCount} service${servicesCount === 1 ? '' : 's'}`}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
