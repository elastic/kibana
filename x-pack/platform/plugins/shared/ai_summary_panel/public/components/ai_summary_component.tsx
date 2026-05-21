/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiProgress, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';
import { getServices } from '../services';
import { streamGenerate } from '../utils/stream_generate';

interface AiSummaryComponentProps {
  title: string | undefined;
  hideTitle: boolean | undefined;
  prompt: string;
  esqlQuery: string | undefined;
  timeRange: { from: string; to: string } | undefined;
  generationVersion: number;
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
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef('');
  // Sync latest html into a ref so the effect can check it without adding html to deps
  const htmlRef = useRef('');
  htmlRef.current = html;

  useEffect(() => {
    if (!prompt) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    accRef.current = '';
    setIsLoading(true);

    let failed = false;

    // Stream partial updates only on first load (no existing html).
    // On regeneration the old html stays visible while the progress bar runs at the top.
    const hasExistingHtml = Boolean(htmlRef.current);
    const interval = hasExistingHtml
      ? undefined
      : setInterval(() => {
          if (accRef.current) setHtml(accRef.current);
        }, 300);

    streamGenerate(
      getServices().http,
      { prompt, esqlQuery, timeRange },
      (token) => {
        accRef.current += token;
      },
      controller.signal
    )
      .catch((err) => {
        if (err.name !== 'AbortError') {
          failed = true;
        }
      })
      .finally(() => {
        if (interval) clearInterval(interval);
        if (controller.signal.aborted) return;
        setIsLoading(false);
        if (!failed) setHtml(accRef.current);
      });

    return () => {
      if (interval) clearInterval(interval);
      controller.abort();
    };
  }, [prompt, esqlQuery, timeRange, generationVersion]);

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
      {html && (
        <div css={iframeContainerCss}>
          <iframe css={iframeCss} srcDoc={html} sandbox="" title={title ?? 'AI panel'} />
        </div>
      )}
    </div>
  );
};
