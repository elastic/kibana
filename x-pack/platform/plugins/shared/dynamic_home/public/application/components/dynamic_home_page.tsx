/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  EuiTitle,
  EuiSkeletonRectangle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';
import type { SpaceContextResponse } from '../../../server/routes/space_context';
import { AIDigestPanel } from './ai_digest_panel';
import { RecentDashboardsWidget } from './recent_dashboards_widget';
import { RecentSearchesWidget } from './recent_searches_widget';
import { AlertsWidget } from './alerts_widget';

interface DynamicHomePageProps {
  http: HttpStart;
}

export const DynamicHomePage: React.FC<DynamicHomePageProps> = ({ http }) => {
  const { euiTheme } = useEuiTheme();
  const [context, setContext] = useState<SpaceContextResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    http
      .get<SpaceContextResponse>('/internal/dynamic_home/space_context')
      .then((data) => {
        setContext(data);
      })
      .finally(() => setIsLoading(false));
  }, [http]);

  const heroStyle = css`
    background: linear-gradient(135deg, #1d87d0 0%, #7b61ff 60%, #a855f7 100%);
    padding: ${euiTheme.size.xxl} ${euiTheme.size.xxl};
    border-radius: ${euiTheme.border.radius.medium};
    color: #fff;
    position: relative;
    overflow: hidden;

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
    font-size: ${euiTheme.size.l};
    margin-top: ${euiTheme.size.s};
  `;

  return (
    <EuiPage paddingSize="l">
      <EuiPageBody>
        {/* Hero header */}
        <div css={heroStyle}>
          <EuiTitle size="l">
            <h1 style={{ color: '#fff' }}>Welcome back</h1>
          </EuiTitle>
          <p css={subtitleStyle}>Here&apos;s what&apos;s happening in your Kibana space</p>
        </div>

        <EuiSpacer size="l" />

        {/* AI Digest */}
        <AIDigestPanel http={http} context={context} isContextLoading={isLoading} />

        <EuiSpacer size="l" />

        {/* Widget grid */}
        {isLoading ? (
          <EuiFlexGroup>
            {[0, 1, 2].map((i) => (
              <EuiFlexItem key={i}>
                <EuiSkeletonRectangle width="100%" height={200} borderRadius="m" />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup alignItems="stretch">
            <EuiFlexItem>
              <RecentDashboardsWidget dashboards={context?.recentDashboards ?? []} />
            </EuiFlexItem>
            <EuiFlexItem>
              <RecentSearchesWidget searches={context?.recentSearches ?? []} />
            </EuiFlexItem>
            <EuiFlexItem>
              <AlertsWidget
                alertStats={context?.alertStats ?? { firing: 0, ok: 0, error: 0, total: 0 }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPageBody>
    </EuiPage>
  );
};
