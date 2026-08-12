/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { EuiThemeColorModeStandard, EuiThemeComputed } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { stripMarkdownFences } from '@kbn/custom-content-common';
import { getServices } from '../services';
import { fetchEsqlData } from '../utils/fetch_esql_data';
import { fillTemplate } from '../utils/fill_template';
import { sanitizeHtml, injectCsp, injectStyleTag } from '../utils/prepare_html';

const RENDER_ERROR_MESSAGE = 'Failed to render panel. Try refreshing or rephrasing the request.';

function buildThemeCss(euiTheme: EuiThemeComputed, colorMode: EuiThemeColorModeStandard): string {
  const isDark = colorMode === 'DARK';
  const c = euiTheme.colors;
  const vars: Array<[string, string]> = [
    ['--cc-color-text', c.textParagraph],
    ['--cc-color-background', isDark ? c.emptyShade : 'transparent'],
    ['--cc-color-surface', isDark ? c.lightestShade : c.emptyShade],
    ['--cc-color-primary', c.primary],
    ['--cc-color-accent', c.accentSecondary],
    ['--cc-color-accent-2', c.accent],
    ['--cc-color-warning', c.warning],
    ['--cc-color-danger', c.danger],
    ['--cc-color-border', c.borderBasePlain],
  ];
  return `:root{${vars.map(([k, v]) => `${k}:${v}`).join(';')}}`;
}

export interface UseCustomContentHtmlParams {
  embeddableId: string;
  esqlQuery: string | undefined;
  timeRange: TimeRange | undefined;
  generationVersion: number;
  savedTemplate: string | undefined;
  colorMode: EuiThemeColorModeStandard;
  euiTheme: EuiThemeComputed;
}

export interface UseCustomContentHtmlResult {
  html: string;
  isLoading: boolean;
  error: string | undefined;
  noContent: boolean;
}

export function useCustomContentHtml({
  embeddableId,
  esqlQuery,
  timeRange,
  generationVersion,
  savedTemplate,
  colorMode,
  euiTheme,
}: UseCustomContentHtmlParams): UseCustomContentHtmlResult {
  const [processedHtml, setProcessedHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (savedTemplate && !esqlQuery) {
      setProcessedHtml(sanitizeHtml(stripMarkdownFences(savedTemplate)));
      setIsLoading(false);
      setError(undefined);
      return;
    }

    if (savedTemplate && esqlQuery) {
      const controller = new AbortController();
      const { core, search } = getServices();

      setIsLoading(true);
      setError(undefined);
      fetchEsqlData(search, core.http, esqlQuery, timeRange, controller.signal)
        .then((response) => fillTemplate(savedTemplate, response.columns, response.values ?? []))
        .then((rawHtml) => {
          if (controller.signal.aborted) return;
          setProcessedHtml(sanitizeHtml(rawHtml));
          setIsLoading(false);
        })
        .catch((err: Error) => {
          if (controller.signal.aborted || err.name === 'AbortError') return;
          setError(err.message || RENDER_ERROR_MESSAGE);
          setIsLoading(false);
        });

      return () => controller.abort();
    }

    setIsLoading(false);
  }, [embeddableId, esqlQuery, generationVersion, savedTemplate, timeRange]);

  const html = useMemo(
    () =>
      processedHtml
        ? injectStyleTag(injectCsp(processedHtml, colorMode), buildThemeCss(euiTheme, colorMode))
        : '',
    [processedHtml, colorMode, euiTheme]
  );

  return { html, isLoading, error, noContent: !savedTemplate };
}
