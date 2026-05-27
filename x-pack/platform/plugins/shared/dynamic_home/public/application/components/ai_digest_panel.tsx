/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { defer } from 'rxjs';
import { httpResponseIntoObservable } from '@kbn/sse-utils-client';
import { isMessageChunkEvent, isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { SpaceContextResponse } from '../../../server/routes/space_context';

interface AIDigestPanelProps {
  http: HttpStart;
  context: SpaceContextResponse | null;
  isContextLoading: boolean;
  agentBuilder?: AgentBuilderPluginStart;
}

const CACHE_KEY = 'kbn_dynamic_home_digest';
const CACHE_TTL_MS = 30 * 60 * 1000;

const readCache = (): { text: string; age: number } | null => {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { text, ts }: { text: string; ts: number } = JSON.parse(raw);
    const age = Date.now() - ts;
    if (age > CACHE_TTL_MS) {
      window.localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return { text, age };
  } catch {
    return null;
  }
};

const writeCache = (text: string) => {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ text, ts: Date.now() }));
  } catch {
    // quota exceeded or unavailable
  }
};

const clearCache = () => {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch (_e) {
    // quota exceeded or unavailable
  }
};

const formatAge = (ms: number): string => {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

export const AIDigestPanel: React.FC<AIDigestPanelProps> = ({
  http,
  context,
  isContextLoading,
  agentBuilder,
}) => {
  const { euiTheme } = useEuiTheme();
  const [digestText, setDigestText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);
  const accumulatedRef = useRef('');

  useEffect(() => {
    if (isContextLoading || !context) return;

    const cached = readCache();
    if (cached) {
      setDigestText(cached.text);
      setIsDone(true);
      setIsStreaming(false);
      setCacheAge(cached.age);
      return;
    }

    setIsStreaming(true);
    setDigestText('');
    setIsDone(false);
    setHasError(false);
    setCacheAge(null);
    accumulatedRef.current = '';

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
            const chunk = (event as any).data.text_chunk as string;
            accumulatedRef.current += chunk;
            setDigestText((prev) => prev + chunk);
          }
          if (isRoundCompleteEvent(event as any)) {
            writeCache(accumulatedRef.current);
            setIsDone(true);
            setIsStreaming(false);
          }
        },
        error: () => {
          setHasError(true);
          setIsStreaming(false);
        },
        complete: () => {
          writeCache(accumulatedRef.current);
          setIsDone(true);
          setIsStreaming(false);
        },
      });

    subRef.current = sub;
    return () => sub.unsubscribe();
  }, [http, context, isContextLoading, refreshKey]);

  const handleRefresh = () => {
    clearCache();
    if (subRef.current) subRef.current.unsubscribe();
    accumulatedRef.current = '';
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

  const { digestProse, suggestions } = useMemo(() => {
    const sepIdx = digestText.indexOf('\n---');
    if (sepIdx === -1) return { digestProse: digestText, suggestions: [] };
    const prose = digestText.slice(0, sepIdx).trim();
    const rest = digestText.slice(sepIdx + 4).trim();
    const bullets = rest
      .split('\n')
      .map((l) => l.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
    return { digestProse: prose, suggestions: bullets };
  }, [digestText]);

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
        {isDone && cacheAge !== null && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {formatAge(cacheAge)}
            </EuiText>
          </EuiFlexItem>
        )}
        {isDone && cacheAge === null && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">Done</EuiBadge>
          </EuiFlexItem>
        )}
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Regenerate digest" disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="refresh"
              aria-label="Regenerate digest"
              onClick={handleRefresh}
              isDisabled={isStreaming}
              size="s"
              color="text"
            />
          </EuiToolTip>
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
        <>
          <EuiText size="m">
            <p>
              {digestProse}
              {isStreaming && !digestText.includes('\n---') && <span css={cursorStyle} />}
            </p>
          </EuiText>

          {suggestions.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s" wrap>
                {suggestions.map((s, i) => (
                  <EuiFlexItem grow={false} key={i}>
                    <EuiButtonEmpty
                      size="s"
                      iconType="sparkles"
                      onClick={() =>
                        agentBuilder?.openChat({
                          agentId: 'home-digest-agent',
                          initialMessage: s,
                          autoSendInitialMessage: true,
                          newConversation: true,
                        })
                      }
                      isDisabled={!agentBuilder}
                      color="primary"
                      css={css`
                        border: 1px solid ${euiTheme.colors.primary};
                        border-radius: ${euiTheme.border.radius.medium};
                        font-size: ${euiTheme.size.m};
                      `}
                    >
                      {s}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </>
          )}
        </>
      )}
    </EuiPanel>
  );
};
