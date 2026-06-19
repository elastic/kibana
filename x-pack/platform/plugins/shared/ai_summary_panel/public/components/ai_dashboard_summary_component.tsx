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
import type { TimeRange } from '@kbn/es-query';
import { getServices } from '../services';
import { streamNdjson } from '../utils/stream_generate';
import { sanitizeTemplate, isValidTemplate, fillSummaryTemplate } from '../utils/template_fill';
import type { SummaryPanelData, TemplateColumn } from '../utils/template_fill';
import { extractPanelDescriptor } from '../utils/sibling_panels';
import type { PanelDescriptor } from '../utils/sibling_panels';

interface EsqlDataResult {
  columns: TemplateColumn[];
  rows: unknown[][];
}

interface AiDashboardSummaryComponentProps {
  embeddableId: string;
  title: string | undefined;
  hideTitle: boolean | undefined;
  parentApi: unknown;
  customInstructions: string | undefined;
  timeRange: TimeRange | undefined;
  generationVersion: number;
  savedTemplate: string | undefined;
  onTemplateChange: (template: string) => void;
}

const iframeContainerCss = css({ position: 'relative', flex: '1 1 0%', minHeight: 200 });
const iframeCss = css({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
});

export const AiDashboardSummaryComponent = ({
  embeddableId,
  title,
  hideTitle,
  parentApi,
  customInstructions,
  timeRange,
  generationVersion,
  savedTemplate,
  onTemplateChange,
}: AiDashboardSummaryComponentProps) => {
  const { euiTheme } = useEuiTheme();
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const accRef = useRef('');

  const savedTemplateRef = useRef(savedTemplate);
  const onTemplateChangeRef = useRef(onTemplateChange);
  useEffect(() => {
    savedTemplateRef.current = savedTemplate;
  }, [savedTemplate]);
  useEffect(() => {
    onTemplateChangeRef.current = onTemplateChange;
  }, [onTemplateChange]);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    accRef.current = '';
    setIsLoading(true);
    setError(undefined);

    const http = getServices().http;

    // Discover siblings that have an ES|QL query.
    // children$ may be empty on first mount if siblings haven't registered yet,
    // so we subscribe and wait for a non-empty result (with a 3s timeout).
    const resolvePanels = (): Promise<PanelDescriptor[]> => {
      const pa = parentApi as Record<string, unknown> | null;
      interface ChildrenSubject {
        getValue: () => Record<string, unknown>;
        subscribe: (fn: (v: Record<string, unknown>) => void) => { unsubscribe: () => void };
      }
      const childrenSubject = pa?.children$ as ChildrenSubject | undefined;
      if (!childrenSubject) return Promise.resolve([]);

      const extract = (ch: Record<string, unknown>): PanelDescriptor[] =>
        Object.entries(ch)
          .filter(([id]) => id !== embeddableId)
          .map(([, api], index) => extractPanelDescriptor(api, index))
          .filter((p): p is PanelDescriptor => p !== null)
          .reduce<PanelDescriptor[]>((acc, p) => {
            const existing = acc.filter((x) => x.key === p.key).length;
            return [...acc, existing > 0 ? { ...p, key: `${p.key}_${existing}` } : p];
          }, []);

      const current = extract(childrenSubject.getValue());
      if (current.length > 0) return Promise.resolve(current);

      // Wait for siblings to mount (up to 3s).
      // Uses an abort-signal listener so navigating away immediately cancels the wait.
      return new Promise((resolve) => {
        const cleanup = (result: PanelDescriptor[]) => {
          clearTimeout(timer);
          sub.unsubscribe();
          controller.signal.removeEventListener('abort', onAbort);
          resolve(result);
        };
        const onAbort = () => cleanup([]);
        controller.signal.addEventListener('abort', onAbort);

        const timer = setTimeout(() => cleanup(extract(childrenSubject.getValue())), 3_000);
        const sub = childrenSubject.subscribe((ch) => {
          const found = extract(ch);
          if (found.length > 0) cleanup(found);
        });

        if (controller.signal.aborted) onAbort();
      });
    };

    const fetchPanelData = (panels: PanelDescriptor[]) =>
      Promise.all(
        panels.map(({ key, title: pTitle, esqlQuery }) =>
          http
            .post<EsqlDataResult>('/internal/ai_summary_panel/esql_data', {
              body: JSON.stringify({ esqlQuery, timeRange }),
              signal: controller.signal,
            })
            .then(
              ({ columns, rows }) => ({ key, title: pTitle, columns, rows } as SummaryPanelData)
            )
            .catch(() => ({ key, title: pTitle, columns: [], rows: [] } as SummaryPanelData))
        )
      );

    resolvePanels()
      .catch(() => [] as PanelDescriptor[])
      .then((panels) => {
        if (controller.signal.aborted) return;

        if (panels.length === 0) {
          setError(
            i18n.translate('aiSummaryPanel.dashboardSummary.noPanels', {
              defaultMessage:
                'No ES|QL panels found on this dashboard. Add at least one AI Summary panel or Lens ES|QL panel.',
            })
          );
          setIsLoading(false);
          return;
        }

        const template = savedTemplateRef.current;

        // Fast path: template stored — run queries only, no LLM
        if (template) {
          fetchPanelData(panels).then((panelData) => {
            if (controller.signal.aborted) return;
            setHtml(fillSummaryTemplate(template, panelData));
            setIsLoading(false);
          });
          return;
        }

        // Slow path: LLM generates the Liquid template; queries run in parallel
        let templateDone = false;
        let dataDone = false;
        let panelDataResult: SummaryPanelData[] | null = null;
        let hasFailed = false;

        const tryFinish = () => {
          if (!templateDone || !dataDone || hasFailed || controller.signal.aborted) return;
          const cleaned = sanitizeTemplate(accRef.current);
          if (!isValidTemplate(cleaned)) {
            setError('Failed to generate summary — please try again.');
            setIsLoading(false);
            return;
          }
          onTemplateChangeRef.current(cleaned);
          setHtml(fillSummaryTemplate(cleaned, panelDataResult ?? []));
          setIsLoading(false);
        };

        fetchPanelData(panels).then((results) => {
          if (controller.signal.aborted) return;
          panelDataResult = results;
          dataDone = true;
          tryFinish();
        });

        streamNdjson(
          http,
          '/internal/ai_summary_panel/generate_summary',
          {
            panels: panels.map(({ title: pTitle, key, esqlQuery }) => ({
              title: pTitle,
              key,
              esqlQuery,
            })),
            timeRange,
            customInstructions,
          },
          (token) => {
            accRef.current += token;
          },
          controller.signal
        )
          .catch((err: Error) => {
            if (err.name !== 'AbortError') {
              hasFailed = true;
              setError(err.message || 'Failed to generate summary');
              setIsLoading(false);
            }
          })
          .finally(() => {
            if (hasFailed || controller.signal.aborted) return;
            templateDone = true;
            tryFinish();
          });
      });

    return () => controller.abort();
  }, [embeddableId, customInstructions, timeRange, generationVersion, parentApi]);

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
      {error && <EuiCallOut color="danger" title={error} style={{ margin: 16 }} announceOnMount />}
      {!error && html && (
        <div css={iframeContainerCss}>
          <iframe
            css={iframeCss}
            srcDoc={html}
            sandbox=""
            title={title ?? 'AI dashboard summary'}
          />
        </div>
      )}
    </div>
  );
};
