/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';
import type { RecentAlert } from '../../../server/routes/space_context';

interface RecentAlertsFeedProps {
  alerts: RecentAlert[];
  http: HttpStart;
}

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const RecentAlertsFeed: React.FC<RecentAlertsFeedProps> = ({ alerts, http }) => {
  const { euiTheme } = useEuiTheme();

  const rowStyle = css`
    padding: ${euiTheme.size.s} 0;
    border-bottom: 1px solid ${euiTheme.colors.lightShade};
    &:last-child {
      border-bottom: none;
    }
  `;

  if (alerts.length === 0) {
    return (
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="bell" size="m" color="subdued" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>Recent Alerts</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <p>No active or errored alerts.</p>
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type="bell" size="m" color="danger" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>Recent Alerts</h3>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href={http.basePath.prepend('/app/observability/alerts')} target="_self">
            <EuiText size="xs">View all</EuiText>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {alerts.map((alert) => (
        <div key={alert.id} css={rowStyle}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon
                type={alert.status === 'active' ? 'warning' : 'alert'}
                color={alert.status === 'active' ? 'warning' : 'danger'}
                size="s"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <span>{alert.name}</span>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={alert.status === 'active' ? 'warning' : 'danger'}>
                    {alert.status}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <span>{formatRelativeTime(alert.updatedAt)}</span>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      ))}
    </EuiPanel>
  );
};
