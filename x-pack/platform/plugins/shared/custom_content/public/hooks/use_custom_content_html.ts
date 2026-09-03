/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { EuiThemeColorModeStandard, EuiThemeComputed } from '@elastic/eui';
import type { AggregateQuery, Filter, Query, TimeRange, ProjectRouting } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { stripMarkdownFences } from '@kbn/custom-content-common';
import { i18n } from '@kbn/i18n';
import { getServices } from '../services';
import { fetchEsqlData } from '../utils/fetch_esql_data';
import { fillTemplate } from '../utils/fill_template';
import { sanitizeHtml, applyHtmlTheme } from '../utils/prepare_html';

const RENDER_ERROR_MESSAGE = i18n.translate('xpack.customContent.renderError', {
  defaultMessage: 'Failed to render panel. Try refreshing or rephrasing the request.',
});

export interface UseCustomContentHtmlParams {
  embeddableId: string;
  esqlQuery: string | undefined;
  timeRange: TimeRange | undefined;
  generationVersion: number;
  savedTemplate: string | undefined;
  colorMode: EuiThemeColorModeStandard;
  euiTheme: EuiThemeComputed;
  isApproximate: boolean;
  projectRouting: ProjectRouting | undefined;
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  esqlVariables: ESQLControlVariable[] | undefined;
  setApproximationApplied?: (approximationApplied: boolean | undefined) => void;
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
  isApproximate,
  projectRouting,
  query,
  filters,
  esqlVariables,
  setApproximationApplied,
}: UseCustomContentHtmlParams): UseCustomContentHtmlResult {
  const [processedHtml, setProcessedHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const trimmedTemplate = savedTemplate?.trim() || undefined;

  useEffect(() => {
    if (trimmedTemplate && !esqlQuery) {
      setProcessedHtml(sanitizeHtml(stripMarkdownFences(trimmedTemplate)));
      setIsLoading(false);
      setError(undefined);
      return;
    }

    if (trimmedTemplate && esqlQuery) {
      const controller = new AbortController();
      const { core, search } = getServices();
      const fetchOptions = {
        isApproximate,
        projectRouting,
        query,
        filters,
        esQueryConfig: getEsQueryConfig(core.uiSettings),
        esqlVariables,
      };
      const template = stripMarkdownFences(trimmedTemplate);

      setIsLoading(true);
      setError(undefined);
      fetchEsqlData(search, core.http, esqlQuery, timeRange, controller.signal, fetchOptions)
        .then((response) => {
          if (!controller.signal.aborted) setApproximationApplied?.(response.approximation_applied);
          return fillTemplate(template, response.columns, response.values ?? []);
        })
        .then((rawHtml) => {
          if (controller.signal.aborted) return;
          setProcessedHtml(sanitizeHtml(rawHtml));
          setIsLoading(false);
        })
        .catch((err: Error) => {
          if (controller.signal.aborted || err.name === 'AbortError') return;
          setApproximationApplied?.(undefined);
          setError(err.message || RENDER_ERROR_MESSAGE);
          setIsLoading(false);
        });

      return () => controller.abort();
    }

    setApproximationApplied?.(undefined);
    setProcessedHtml('');
    setError(undefined);
    setIsLoading(false);
  }, [
    embeddableId,
    esqlQuery,
    generationVersion,
    trimmedTemplate,
    timeRange,
    isApproximate,
    projectRouting,
    query,
    filters,
    esqlVariables,
    setApproximationApplied,
  ]);

  const html = useMemo(
    () => (processedHtml ? applyHtmlTheme(processedHtml, colorMode, euiTheme) : ''),
    [processedHtml, colorMode, euiTheme]
  );

  return { html, isLoading, error, noContent: !trimmedTemplate };
}
