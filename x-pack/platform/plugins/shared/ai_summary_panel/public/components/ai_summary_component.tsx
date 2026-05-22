/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';
import { getServices } from '../services';
import { streamGenerate } from '../utils/stream_generate';

interface AiSummaryComponentProps {
  embeddableId: string;
  title: string | undefined;
  hideTitle: boolean | undefined;
  prompt: string;
  esqlQuery: string | undefined;
  timeRange: { from: string; to: string } | undefined;
  generationVersion: number;
}

const L1_TTL_MS = 30 * 60 * 1000;

interface L1Entry {
  html: string;
  ts: number;
}

function l1Hash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function l1Key(embeddableId: string, prompt: string, esqlQuery: string | undefined, timeRange: { from: string; to: string } | undefined): string {
  return `ai_panel:${l1Hash(embeddableId + prompt + (esqlQuery ?? '') + (timeRange?.from ?? '') + (timeRange?.to ?? ''))}`;
}

function readL1(key: string): string | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as L1Entry;
    return Date.now() - entry.ts < L1_TTL_MS ? entry.html : null;
  } catch {
    return null;
  }
}

function writeL1(key: string, html: string): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ html, ts: Date.now() } satisfies L1Entry));
  } catch {
    // sessionStorage full — non-fatal
  }
}

const iframeContainerCss = css({
  position: 'relative',
  flex: '1 1 0%',
  minHeight: 200,
});

const iframeCss = css({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
});

export const AiSummaryComponent = ({
  embeddableId,
  title,
  hideTitle,
  prompt,
  esqlQuery,
  timeRange,
  generationVersion,
}: AiSummaryComponentProps) => {
  const { euiTheme } = useEuiTheme();
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(prompt));
  const [error, setError] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef('');
  const htmlRef = useRef('');
  htmlRef.current = html;
  // Tracks whether this is the very first render — L1 cache only applies on initial mount,
  // not when time range / prompt changes mid-session (user expects fresh data then).
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!prompt) return;

    const isInitialMount = !mountedRef.current;
    mountedRef.current = true;

    const key = l1Key(embeddableId, prompt, esqlQuery, timeRange);
    if (isInitialMount && generationVersion === 0) {
      const cached = readL1(key);
      if (cached) {
        setHtml(cached);
        setIsLoading(false);
        return;
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    accRef.current = '';
    setIsLoading(true);
    setError(undefined);

    let failed = false;
    let failedMessage = '';
    let intervalRef: ReturnType<typeof setInterval> | undefined;

    const stopInterval = () => {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = undefined;
      }
    };

    // Stream partial updates only on first load (no existing html) and not stale-while-revalidate.
    // On regeneration / SWR the old html stays visible while the progress bar runs at the top.
    const hasExistingHtml = Boolean(htmlRef.current);
    if (!hasExistingHtml) {
      intervalRef = setInterval(() => {
        if (accRef.current) setHtml(accRef.current);
      }, 300);
    }

    streamGenerate(
      getServices().http,
      { prompt, esqlQuery, timeRange },
      (token) => {
        accRef.current += token;
      },
      controller.signal,
      (staleHtml) => {
        stopInterval();
        setHtml(staleHtml);
      }
    )
      .catch((err) => {
        if (err.name !== 'AbortError') {
          failed = true;
          failedMessage = err instanceof Error ? err.message : String(err);
        }
      })
      .finally(() => {
        stopInterval();
        if (controller.signal.aborted) return;
        setIsLoading(false);
        if (failed) {
          setError(failedMessage || 'Failed to generate panel content');
        } else {
          const finalHtml = accRef.current;
          if (finalHtml) {
            setHtml(finalHtml);
            writeL1(key, finalHtml);
          }
        }
      });

    return () => {
      stopInterval();
      controller.abort();
    };
  }, [embeddableId, prompt, esqlQuery, timeRange, generationVersion]);

  const wrapperCss = css({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 100%',
    minHeight: 200,
    background: euiTheme.colors.emptyShade,
  });

  return (
    <div css={wrapperCss}>
      {isLoading && <EuiProgress size="xs" color="accent" position="absolute" />}
      {!hideTitle && title && (
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          style={{ padding: '8px 16px 0', flexShrink: 0 }}
        >
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('aiSummaryPanel.badge.aiGenerated', {
                defaultMessage: 'AI generated',
              })}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {error && (
        <EuiCallOut
          color="danger"
          title={i18n.translate('aiSummaryPanel.error.title', {
            defaultMessage: 'Failed to generate panel',
          })}
          style={{ margin: 16 }}
          announceOnMount
        >
          {error}
        </EuiCallOut>
      )}
      {!error && html && (
        <div css={iframeContainerCss}>
          <iframe css={iframeCss} srcDoc={html} sandbox="" title={title ?? 'AI panel'} />
        </div>
      )}
    </div>
  );
};
