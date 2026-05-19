/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  EuiTitle,
  EuiSkeletonRectangle,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { SpaceContextResponse } from '../../../server/routes/space_context';
import { AIDigestPanel } from './ai_digest_panel';
import { RecentDashboardsWidget } from './recent_dashboards_widget';
import { RecentSearchesWidget } from './recent_searches_widget';
import { AlertsWidget } from './alerts_widget';
import { SolutionNav } from './solution_nav';
import { SpaceActivityChart } from './space_activity_chart';
import { TopIndicesChart } from './top_indices_chart';
import { GetStartedPanel } from './get_started_panel';
import { QuickSearchBar } from './quick_search_bar';
import { RecentAlertsFeed } from './recent_alerts_feed';
import { FavoritesWidget } from './favorites_widget';

interface DynamicHomePageProps {
  http: HttpStart;
  agentBuilder?: AgentBuilderPluginStart;
}

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const HEALTH_COLORS: Record<string, string> = {
  green: 'success',
  yellow: 'warning',
  red: 'danger',
  unknown: 'default',
};

export const DynamicHomePage: React.FC<DynamicHomePageProps> = ({ http, agentBuilder }) => {
  const { euiTheme } = useEuiTheme();
  const [context, setContext] = useState<SpaceContextResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    http
      .get<SpaceContextResponse>('/internal/dynamic_home/space_context')
      .then((data) => setContext(data))
      .finally(() => setIsLoading(false));

    http
      .get<{ full_name?: string; username: string }>('/internal/security/me')
      .then((user) => setUserName(user.full_name || user.username))
      .catch(() => {});
  }, [http]);

  const gradientShift = keyframes`
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  `;

  const heroStyle = css`
    background: linear-gradient(135deg, #1d87d0 0%, #7b61ff 40%, #a855f7 70%, #1d87d0 100%);
    background-size: 300% 300%;
    animation: ${gradientShift} 10s ease infinite;
    padding: ${euiTheme.size.l} ${euiTheme.size.xxl};
    border-radius: ${euiTheme.border.radius.medium};
    color: #fff;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(
        ellipse at 80% 50%,
        rgba(255, 255, 255, 0.08) 0%,
        transparent 60%
      );
      pointer-events: none;
    }
  `;

  const subtitleStyle = css`
    color: rgba(255, 255, 255, 0.8);
    font-size: ${euiTheme.size.m};
    margin-top: ${euiTheme.size.xs};
  `;

  return (
    <EuiPage paddingSize="l">
      <EuiPageBody>
        {/* Hero header */}
        <div css={heroStyle}>
          {context?.clusterHealth && context.clusterHealth !== 'unknown' && (
            <div style={{ position: 'absolute', top: euiTheme.size.l, right: euiTheme.size.l }}>
              <EuiBadge color={HEALTH_COLORS[context.clusterHealth]}>
                Cluster: {context.clusterHealth}
              </EuiBadge>
            </div>
          )}
          <EuiTitle size="m">
            <h1 style={{ color: '#fff' }}>
              {getGreeting()}
              {userName ? `, ${userName}` : ''}
            </h1>
          </EuiTitle>
          <p css={subtitleStyle}>Here&apos;s what&apos;s happening in your Kibana space</p>
          <QuickSearchBar http={http} />
        </div>

        <EuiSpacer size="l" />

        {/* AI Digest with suggestions */}
        <AIDigestPanel
          http={http}
          context={context}
          isContextLoading={isLoading}
          agentBuilder={agentBuilder}
        />

        <EuiSpacer size="l" />

        {/* Solution nav */}
        <SolutionNav http={http} />

        <EuiSpacer size="l" />

        {/* Get started — only when space is empty */}
        {!isLoading &&
          context?.recentDashboards.length === 0 &&
          context?.recentSearches.length === 0 && (
            <>
              <GetStartedPanel http={http} />
              <EuiSpacer size="l" />
            </>
          )}

        {/* Widget grid — Favorites | Recent Dashboards | Recent Searches */}
        {isLoading ? (
          <EuiFlexGroup>
            {[0, 1, 2].map((i) => (
              <EuiFlexItem key={i}>
                <EuiSkeletonRectangle width="100%" height={260} borderRadius="m" />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup alignItems="stretch">
            <EuiFlexItem>
              <FavoritesWidget http={http} />
            </EuiFlexItem>
            <EuiFlexItem>
              <RecentDashboardsWidget dashboards={context?.recentDashboards ?? []} http={http} />
            </EuiFlexItem>
            <EuiFlexItem>
              <RecentSearchesWidget searches={context?.recentSearches ?? []} http={http} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        <EuiSpacer size="l" />

        {/* Alerts row — donut + recent alerts feed */}
        {isLoading ? (
          <EuiFlexGroup>
            {[0, 1].map((i) => (
              <EuiFlexItem key={i}>
                <EuiSkeletonRectangle width="100%" height={260} borderRadius="m" />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup alignItems="stretch">
            <EuiFlexItem>
              <AlertsWidget
                alertStats={context?.alertStats ?? { firing: 0, ok: 0, error: 0, total: 0 }}
                http={http}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <RecentAlertsFeed alerts={context?.recentAlerts ?? []} http={http} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        <EuiSpacer size="l" />

        {/* Insights row */}
        {isLoading ? (
          <EuiFlexGroup>
            {[0, 1].map((i) => (
              <EuiFlexItem key={i}>
                <EuiSkeletonRectangle width="100%" height={260} borderRadius="m" />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup alignItems="stretch">
            <EuiFlexItem>
              <SpaceActivityChart activityByDay={context?.activityByDay ?? []} />
            </EuiFlexItem>
            <EuiFlexItem>
              <TopIndicesChart topIndices={context?.topIndices ?? []} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}

        <EuiSpacer size="xl" />
      </EuiPageBody>
    </EuiPage>
  );
};
