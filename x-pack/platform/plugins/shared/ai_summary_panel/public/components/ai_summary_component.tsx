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
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getServices } from '../services';
import { streamGenerate } from '../utils/stream_generate';
import { fetchEsqlData } from '../utils/fetch_esql_data';
import type { EsqlDataResult } from '../utils/fetch_esql_data';
import {
  fillTemplate,
  sanitizeTemplate,
  isValidTemplate,
  injectCsp,
  sanitizeHtml,
} from '../utils/template_fill';

interface AiSummaryComponentProps {
  embeddableId: string;
  title: string | undefined;
  hideTitle: boolean | undefined;
  prompt: string;
  esqlQuery: string | undefined;
  timeRange: { from: string; to: string } | undefined;
  generationVersion: number;
  savedTemplate: string | undefined;
  onTemplateChange: (template: string) => void;
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
  savedTemplate,
  onTemplateChange,
}: AiSummaryComponentProps) => {
  const { euiTheme } = useEuiTheme();
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(prompt));
  const [error, setError] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef('');
  const htmlRef = useRef('');
  htmlRef.current = html;

  // Refs so effect closure always reads latest value without them being deps.
  const savedTemplateRef = useRef(savedTemplate);
  const onTemplateChangeRef = useRef(onTemplateChange);
  useEffect(() => {
    savedTemplateRef.current = savedTemplate;
  }, [savedTemplate]);
  useEffect(() => {
    onTemplateChangeRef.current = onTemplateChange;
  }, [onTemplateChange]);

  useEffect(() => {
    if (!prompt) {
      setIsLoading(false);
      return;
    }

    // Abort any prior inflight request unconditionally before taking any path.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    accRef.current = '';

    const template = savedTemplateRef.current;

    // Fast path — static panel with stored HTML: sanitize then render, no server calls.
    if (template && !esqlQuery) {
      setHtml(injectCsp(sanitizeHtml(template)));
      setIsLoading(false);
      setError(undefined);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    const { search } = getServices();

    // Fast path — esqlQuery panel with stored template: run query only, no LLM.
    if (template && esqlQuery) {
      fetchEsqlData(search, esqlQuery, timeRange, controller.signal)
        .then(({ columns, rows }) => {
          if (controller.signal.aborted) return;
          setHtml(fillTemplate(template, columns, rows));
          setIsLoading(false);
        })
        .catch((err: Error) => {
          if (controller.signal.aborted || err.name === 'AbortError') return;
          setError(err.message || 'Failed to fetch data');
          setIsLoading(false);
        });

      return () => controller.abort();
    }

    // Slow path — no stored template: LLM generates template. For esqlQuery panels the
    // data fetch runs in parallel so both complete as close together as possible.
    let esqlData: EsqlDataResult | null = null;
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

    // Stream partial HTML into the iframe for static panels (no placeholders to leak through).
    if (!htmlRef.current && !esqlQuery) {
      intervalRef = setInterval(() => {
        if (accRef.current) setHtml(injectCsp(sanitizeHtml(accRef.current)));
      }, 300);
    }

    const tryFinish = () => {
      if (!templateDone || !dataDone || hasFailed || controller.signal.aborted) return;
      stopInterval();

      let rendered: string;

      if (esqlQuery && esqlData) {
        const cleaned = sanitizeTemplate(accRef.current);
        if (!isValidTemplate(cleaned)) {
          setError('Failed to generate panel: LLM returned invalid template');
          setIsLoading(false);
          return;
        }
        rendered = fillTemplate(cleaned, esqlData.columns, esqlData.rows);
        onTemplateChangeRef.current(cleaned);
      } else if (!esqlQuery) {
        // Static panel: sanitize then store. CSP is already in the accumulator
        // from the route's first token, but sanitizeHtml must still run to strip
        // any anchor tags the LLM emitted.
        rendered = injectCsp(sanitizeHtml(accRef.current));
        onTemplateChangeRef.current(rendered);
      } else {
        return; // esqlQuery present but data fetch failed — error already set
      }

      setHtml(rendered);
      setIsLoading(false);
    };

    // Fetch data in parallel with LLM (template panels only)
    if (esqlQuery) {
      fetchEsqlData(search, esqlQuery, timeRange, controller.signal)
        .then((data) => {
          if (controller.signal.aborted) return;
          esqlData = data;
          dataDone = true;
          tryFinish();
        })
        .catch((err: Error) => {
          if (controller.signal.aborted || err.name === 'AbortError') return;
          hasFailed = true;
          setError(err.message || 'Failed to fetch data');
          setIsLoading(false);
        });
    }

    const http = getServices().core.http;
    streamGenerate(
      http,
      { prompt, esqlQuery, timeRange },
      (token) => {
        accRef.current += token;
      },
      controller.signal
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
    // savedTemplate intentionally omitted — read via savedTemplateRef to avoid re-triggering.
  }, [embeddableId, prompt, esqlQuery, timeRange, generationVersion]);

  const wrapperCss = useMemo(
    () =>
      css({
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 100%',
        minHeight: 200,
        background: euiTheme.colors.emptyShade,
      }),
    [euiTheme.colors.emptyShade]
  );

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
