/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

interface Dashboard {
  id: string;
  title: string;
  updatedAt: string;
}

interface RecentDashboardsWidgetProps {
  dashboards: Dashboard[];
}

const relativeTime = (isoDate: string): string => {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const RecentDashboardsWidget: React.FC<RecentDashboardsWidgetProps> = ({ dashboards }) => {
  return (
    <EuiPanel hasBorder style={{ height: '100%' }}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="dashboardApp" size="m" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Recent Dashboards</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      {dashboards.length === 0 ? (
        <EuiEmptyPrompt
          iconType="dashboardApp"
          title={<h3>No dashboards yet</h3>}
          body={<p>Create your first dashboard to see it here.</p>}
          titleSize="xs"
        />
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {dashboards.map((d) => (
            <EuiFlexItem key={d.id}>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <EuiLink href={`/app/dashboards#/view/${d.id}`} target="_self">
                    <EuiText size="s">
                      <p>{d.title}</p>
                    </EuiText>
                  </EuiLink>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>{relativeTime(d.updatedAt)}</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
