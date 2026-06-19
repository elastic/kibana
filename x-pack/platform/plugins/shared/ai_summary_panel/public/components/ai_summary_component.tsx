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
import {
  isTemplate,
  fillTemplate,
  readSessionTemplate,
  writeSessionTemplate,
} from '../utils/template_fill';
import type { TemplateColumn } from '../utils/template_fill';

interface AiSummaryComponentProps {
  embeddableId: string;
  title: string | undefined;
  hideTitle: boolean | undefined;
  prompt: string;
  esqlQuery: string | undefined;
  timeRange: { from: string; to: string } | undefined;
  generationVersion: number;
}

interface EsqlDataResult {
  columns: TemplateColumn[];
  rows: unknown[][];
}

const L1_TTL_MS = 30 * 60 * 1000;

interface L1Entry {
  html: string;
  ts: number;
}

function l1Hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33 + str.charCodeAt(i)) % 2147483647;
  }
  return h.toString(36);
}

function l1Key(
  embeddableId: string,
  prompt: string,
  esqlQuery: string | undefined,
  timeRange: { from: string; to: string } | undefined
): string {
  return `ai_panel:${l1Hash(
    embeddableId + prompt + (esqlQuery ?? '') + (timeRange?.from ?? '') + (timeRange?.to ?? '')
  )}`;
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

    const http = getServices().http;

    // Fast path: a template is cached in sessionStorage from an earlier generation this session.
    // Only run the ES|QL query — no LLM call needed.
    const sessionTemplate = esqlQuery ? readSessionTemplate(prompt, esqlQuery) : null;

    if (sessionTemplate && esqlQuery) {
      http
        .post<EsqlDataResult>('/internal/ai_summary_panel/esql_data', {
          body: JSON.stringify({ esqlQuery, timeRange }),
          signal: controller.signal,
        })
        .then(({ columns, rows }) => {
          if (controller.signal.aborted) return;
          const filled = fillTemplate(sessionTemplate, columns, rows);
          setHtml(filled);
          writeL1(key, filled);
          setIsLoading(false);
        })
        .catch((err: Error) => {
          if (controller.signal.aborted || err.name === 'AbortError') return;
          setError(err.message || 'Failed to fetch data');
          setIsLoading(false);
        });

      return () => controller.abort();
    }

    // Slow path: LLM generates the template. For esqlQuery panels, data is fetched in parallel
    // so both finish as close together as possible. For static panels (no esqlQuery), only the
    // LLM runs and partial HTML is streamed live into the iframe.
    let esqlData: EsqlDataResult | null = null;
    let staleTemplate: string | null = null;
    let templateDone = false;
    let dataDone = !esqlQuery;
    let hasFailed = false;

    let intervalRef: ReturnType<typeof setInterval> | undefined;
    const stopInterval = () => {
      if (intervalRef) {
        clearInterval(intervalRef);
        intervalRef = undefined;
      }
    };

    // For static panels, stream partial HTML into the iframe every 300ms as it builds up.
    // Skip for template panels — partial template HTML with {{placeholders}} looks broken.
    const hasExistingHtml = Boolean(htmlRef.current);
    if (!hasExistingHtml && !esqlQuery) {
      intervalRef = setInterval(() => {
        if (accRef.current) setHtml(accRef.current);
      }, 300);
    }

    const tryFinish = () => {
      if (!templateDone || !dataDone || hasFailed || controller.signal.aborted) return;
      stopInterval();

      let rendered: string;
      if (esqlQuery && esqlData) {
        rendered = fillTemplate(accRef.current, esqlData.columns, esqlData.rows);
        writeSessionTemplate(prompt, esqlQuery, accRef.current);
      } else if (!esqlQuery) {
        rendered = accRef.current; // static panel: full HTML already has CSP from route
      } else {
        return; // esqlQuery present but data fetch failed — error already set
      }

      setHtml(rendered);
      writeL1(key, rendered);
      setIsLoading(false);
    };

    // Fetch ES|QL data in parallel with the LLM call (template panels only)
    if (esqlQuery) {
      http
        .post<EsqlDataResult>('/internal/ai_summary_panel/esql_data', {
          body: JSON.stringify({ esqlQuery, timeRange }),
          signal: controller.signal,
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          esqlData = data;
          dataDone = true;
          // SWR: if a stale template arrived before data did, fill and show it immediately
          // while the fresh LLM template finishes in the background.
          if (staleTemplate && !templateDone) {
            setHtml(fillTemplate(staleTemplate, data.columns, data.rows));
          }
          tryFinish();
        })
        .catch((err: Error) => {
          if (controller.signal.aborted || err.name === 'AbortError') return;
          hasFailed = true;
          setError(err.message || 'Failed to fetch data');
          setIsLoading(false);
        });
    }

    streamGenerate(
      http,
      { prompt, esqlQuery, timeRange },
      (token) => {
        accRef.current += token;
      },
      controller.signal,
      (staleHtml) => {
        if (esqlQuery && isTemplate(staleHtml)) {
          // SWR for template panels: store the stale template and fill immediately if data
          // has already arrived, otherwise it will be used when the data fetch completes.
          staleTemplate = staleHtml;
          if (esqlData) {
            setHtml(fillTemplate(staleHtml, esqlData.columns, esqlData.rows));
          }
        } else if (!esqlQuery && !isTemplate(staleHtml)) {
          // Static panel: show stale full HTML while LLM regenerates
          stopInterval();
          setHtml(staleHtml);
        }
      }
    )
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          hasFailed = true;
          stopInterval();
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      })
      .finally(() => {
        if (hasFailed || controller.signal.aborted) return;
        templateDone = true;
        tryFinish();
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
