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
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { getEsQueryConfig } from '@kbn/data-service';
import { stripMarkdownFences } from '@kbn/custom-content-common';
import { i18n } from '@kbn/i18n';
import { fetchEsqlData } from './fetch_esql_data';
import { fillTemplateDatasets } from './fill_template';
import { sanitizeHtml, applyHtmlTheme } from './prepare_html';
import type { CustomContentRendererServices } from './types';
import { getLinkBasePath } from './internal_link';

const RENDER_ERROR_MESSAGE = i18n.translate('xpack.customContent.renderError', {
  defaultMessage: 'Failed to render panel. Try refreshing or rephrasing the request.',
});

export interface UseCustomContentHtmlParams {
  services: CustomContentRendererServices;
  embeddableId: string;
  esqlQuery: string | undefined;
  /** Further queries, exposed to the template as `queries[1]`, `queries[2]`, ... after `esqlQuery`. */
  additionalEsqlQueries?: readonly string[];
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
  isInteractive: boolean;
  /** Records the panel's ES|QL request for the Inspect action. */
  requestAdapter?: RequestAdapter;
  setApproximationApplied?: (approximationApplied: boolean | undefined) => void;
}

export interface UseCustomContentHtmlResult {
  html: string;
  isLoading: boolean;
  error: string | undefined;
  noContent: boolean;
}

export function useCustomContentHtml({
  services,
  embeddableId,
  esqlQuery,
  additionalEsqlQueries,
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
  isInteractive,
  requestAdapter,
  setApproximationApplied,
}: UseCustomContentHtmlParams): UseCustomContentHtmlResult {
  const [filledHtml, setFilledHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const trimmedTemplate = savedTemplate?.trim() || undefined;
  const { http, uiSettings, search } = services;
  // Callers build the list inline, so compare it by value to keep it from refetching on every render.
  const additionalQueriesKey = JSON.stringify(additionalEsqlQueries ?? []);

  useEffect(() => {
    if (trimmedTemplate && !esqlQuery) {
      setFilledHtml(stripMarkdownFences(trimmedTemplate));
      setIsLoading(false);
      setError(undefined);
      return;
    }

    if (trimmedTemplate && esqlQuery) {
      const controller = new AbortController();
      const fetchOptions = {
        isApproximate,
        projectRouting,
        query,
        filters,
        esQueryConfig: getEsQueryConfig(uiSettings),
        esqlVariables,
        requestAdapter,
        // The requests are cleared once below, so the queries don't wipe each other's entries.
        keepRequests: true,
      };
      const template = stripMarkdownFences(trimmedTemplate);
      const queries = [esqlQuery, ...(JSON.parse(additionalQueriesKey) as string[])];

      requestAdapter?.reset();
      setIsLoading(true);
      setError(undefined);
      Promise.all(
        queries.map((queryToFetch, index) =>
          fetchEsqlData(
            search,
            http,
            queryToFetch,
            timeRange,
            controller.signal,
            fetchOptions
          ).catch((err: Error) => {
            // Say which query failed, but leave a single-query panel's message as it is.
            if (queries.length === 1 || err.name === 'AbortError') throw err;
            throw new Error(
              i18n.translate('xpack.customContent.queryFailed', {
                defaultMessage: 'Query {position} failed: {message}',
                values: { position: index + 1, message: err.message },
              })
            );
          })
        )
      )
        .then((responses) => {
          if (!controller.signal.aborted) {
            const flags = responses.map(({ approximation_applied: applied }) => applied);
            setApproximationApplied?.(
              flags.some(Boolean) ? true : flags.includes(false) ? false : undefined
            );
          }
          return fillTemplateDatasets(
            template,
            responses.map(({ columns, values }) => ({ columns, rows: values ?? [] }))
          );
        })
        .then((rawHtml) => {
          if (controller.signal.aborted) return;
          setFilledHtml(rawHtml);
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
    setFilledHtml('');
    setError(undefined);
    setIsLoading(false);
  }, [
    embeddableId,
    esqlQuery,
    additionalQueriesKey,
    generationVersion,
    trimmedTemplate,
    timeRange,
    isApproximate,
    projectRouting,
    query,
    filters,
    esqlVariables,
    requestAdapter,
    http,
    uiSettings,
    search,
    setApproximationApplied,
  ]);

  const html = useMemo(
    () =>
      filledHtml
        ? applyHtmlTheme(
            sanitizeHtml(filledHtml, getLinkBasePath(http), isInteractive),
            colorMode,
            euiTheme
          )
        : '',
    [filledHtml, http, isInteractive, colorMode, euiTheme]
  );

  return { html, isLoading, error, noContent: !trimmedTemplate };
}
