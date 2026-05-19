/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';
import { defer } from 'rxjs';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { isMessageChunkEvent, isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { SpaceContextResponse } from '../../../server/routes/space_context';

interface AIDigestPanelProps {
  http: HttpStart;
  context: SpaceContextResponse | null;
  isContextLoading: boolean;
}

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

export const AIDigestPanel: React.FC<AIDigestPanelProps> = ({
  http,
  context,
  isContextLoading,
}) => {
  const { euiTheme } = useEuiTheme();
  const [digestText, setDigestText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    if (isContextLoading || !context) return;

    setIsStreaming(true);
    setDigestText('');
    setIsDone(false);
    setHasError(false);

    const attachment = {
      hidden: true,
      type: 'screen_context',
      data: {
        app: 'dynamic_home',
        description: 'The user is viewing the Kibana home page.',
        additional_data: {
          recent_dashboards: JSON.stringify(context.recentDashboards.map((d) => d.title)),
          recent_searches: JSON.stringify(context.recentSearches.map((s) => s.title)),
          alert_firing: String(context.alertStats.firing),
          alert_ok: String(context.alertStats.ok),
          alert_total: String(context.alertStats.total),
        },
      },
    };

    const sub = defer(() =>
      http.post('/api/agent_builder/converse/async', {
        asResponse: true,
        rawResponse: true,
        body: JSON.stringify({
          agent_id: 'home-digest-agent',
          input: 'Generate a space digest based on the attached context.',
          attachments: [attachment],
        }),
      })
    )
      .pipe(httpResponseIntoObservable())
      .subscribe({
        next: (event: unknown) => {
          if (isMessageChunkEvent(event as any)) {
            setDigestText((prev) => prev + (event as any).data.text_chunk);
          }
          if (isRoundCompleteEvent(event as any)) {
            setIsDone(true);
            setIsStreaming(false);
          }
        },
        error: () => {
          setHasError(true);
          setIsStreaming(false);
        },
        complete: () => {
          setIsDone(true);
          setIsStreaming(false);
        },
      });

    subRef.current = sub;
    return () => sub.unsubscribe();
  }, [http, context, isContextLoading, refreshKey]);

  const handleRefresh = () => {
    if (subRef.current) subRef.current.unsubscribe();
    setRefreshKey((k) => k + 1);
  };

  const cursorStyle = css`
    display: inline-block;
    width: 2px;
    height: 0.85em;
    background: ${euiTheme.colors.primary};
    vertical-align: middle;
    margin-left: 2px;
    border-radius: 1px;
    animation: ${blink} 1s step-end infinite;
  `;

  const panelBorderStyle = css`
    border-left: 3px solid ${euiTheme.colors.primary};
  `;

  const isLoading = isContextLoading || (isStreaming && !digestText);

  return (
    <EuiPanel hasBorder css={panelBorderStyle}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="sparkles" size="l" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>Space Digest</h3>
          </EuiTitle>
        </EuiFlexItem>
        {isStreaming && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="primary">AI · live</EuiBadge>
          </EuiFlexItem>
        )}
        {isDone && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">Done</EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            aria-label="Regenerate digest"
            onClick={handleRefresh}
            isDisabled={isStreaming}
            size="s"
            color="text"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {isLoading ? (
        <EuiSkeletonText lines={3} />
      ) : hasError ? (
        <EuiText color="subdued" size="s">
          <p>AI digest unavailable. Make sure an AI connector is configured.</p>
        </EuiText>
      ) : (
        <EuiText size="m">
          <p>
            {digestText}
            {isStreaming && <span css={cursorStyle} />}
          </p>
        </EuiText>
      )}
    </EuiPanel>
  );
};
