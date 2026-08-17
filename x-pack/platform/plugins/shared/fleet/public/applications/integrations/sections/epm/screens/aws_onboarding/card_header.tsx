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
  EuiIcon,
  EuiText,
  EuiTextColor,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

// Light lavender-white tint used for card header bands, matched to the
// design reference (Step 14.svg / Deploy & Detect mockups).
export const HEADER_TINT = '#F6F9FC';

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
        background: HEADER_TINT,
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
            <EuiText size="s">
              <EuiTextColor color="primary">
                {`${servicesCount} service${servicesCount === 1 ? '' : 's'}`}
              </EuiTextColor>
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
