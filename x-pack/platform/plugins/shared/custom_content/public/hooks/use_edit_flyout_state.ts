/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import type { EuiThemeColorModeStandard, EuiThemeComputed } from '@elastic/eui';
import type { AggregateQuery, Filter, Query, TimeRange, ProjectRouting } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  getLinkBasePath,
  fetchEsqlData,
  fillTemplateDatasets,
  sanitizeHtml,
  applyHtmlTheme,
  type EsqlDataResult,
} from '@kbn/custom-content-renderer';
import { CUSTOM_CONTENT_MAX_ESQL_QUERIES } from '@kbn/custom-content-common';
import { getServices } from '../services';
import { getRunnableQueries } from '../utils/get_runnable_queries';
import { createDraftQuery, flyoutReducer } from './flyout_reducer';
import type { DraftQuery } from './flyout_reducer';

export interface EditFlyoutState {
  draftEsqlQuery: string;
  setDraftEsqlQuery: (v: string) => void;
  /** The queries after the main one, read by the template as `queries[1]`, `queries[2]`, ... */
  additionalQueries: DraftQuery[];
  canAddQuery: boolean;
  addQuery: () => void;
  removeQuery: (id: number) => void;
  setQueryText: (id: number, text: string) => void;
  fetchQueryData: (id: number) => Promise<void>;
  draftTemplate: string;
  setDraftTemplate: (v: string) => void;
  isAiAvailable: boolean;
  isDataLoading: boolean;
  esqlData: EsqlDataResult | null;
  esqlDataError: string | null;
  renderError: string | null;
  handleFetchData: () => Promise<void>;
  isRenderLoading: boolean;
  handleRender: () => Promise<void>;
}

export interface UseEditFlyoutStateParams {
  esqlQuery: string | undefined;
  additionalEsqlQueries?: readonly string[];
  template: string | undefined;
  timeRange: TimeRange | undefined;
  colorMode: EuiThemeColorModeStandard;
  euiTheme: EuiThemeComputed;
  isApproximate: boolean;
  projectRouting: ProjectRouting | undefined;
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
  esqlVariables: ESQLControlVariable[] | undefined;
  onRunPreview: (html: string) => void;
}

export const useEditFlyoutState = ({
  esqlQuery,
  additionalEsqlQueries = [],
  template,
  timeRange,
  colorMode,
  euiTheme,
  isApproximate,
  projectRouting,
  query,
  filters,
  esqlVariables,
  onRunPreview,
}: UseEditFlyoutStateParams): EditFlyoutState => {
  const [state, dispatch] = useReducer(flyoutReducer, {
    draftEsqlQuery: esqlQuery ?? '',
    additionalQueries: additionalEsqlQueries.map((text, id) => createDraftQuery(id, text)),
    nextQueryId: additionalEsqlQueries.length,
    draftTemplate: template ?? '',
    isDataLoading: false,
    esqlData: null,
    esqlDataError: null,
    renderError: null,
    isRenderLoading: false,
  });

  const abortRef = useRef<AbortController | undefined>(undefined);
  const runPreviewAbortRef = useRef<AbortController | undefined>(undefined);
  const draftVersionRef = useRef(0);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      runPreviewAbortRef.current?.abort();
    };
  }, []);

  const { agentBuilder, core, search } = getServices();
  const isAiAvailable = Boolean(agentBuilder);

  const setDraftEsqlQuery = useCallback((v: string) => {
    draftVersionRef.current += 1;
    dispatch({ type: 'SET_ESQL_QUERY', payload: v });
  }, []);
  const setDraftTemplate = useCallback((v: string) => {
    draftVersionRef.current += 1;
    dispatch({ type: 'SET_TEMPLATE', payload: v });
  }, []);

  const addQuery = useCallback(() => {
    draftVersionRef.current += 1;
    dispatch({ type: 'ADD_QUERY' });
  }, []);
  const removeQuery = useCallback((id: number) => {
    draftVersionRef.current += 1;
    dispatch({ type: 'REMOVE_QUERY', id });
  }, []);
  const setQueryText = useCallback((id: number, text: string) => {
    draftVersionRef.current += 1;
    dispatch({ type: 'SET_QUERY_TEXT', id, payload: text });
  }, []);

  const handleFetchData = useCallback(async () => {
    if (!state.draftEsqlQuery) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: 'FETCH_DATA_START' });

    const fetchOptions = {
      isApproximate,
      projectRouting,
      query,
      filters,
      esqlVariables,
      esQueryConfig: getEsQueryConfig(core.uiSettings),
    };

    try {
      const result = await fetchEsqlData(
        search,
        core.http,
        state.draftEsqlQuery,
        timeRange,
        controller.signal,
        fetchOptions
      );
      if (!controller.signal.aborted) {
        dispatch({ type: 'FETCH_DATA_SUCCESS', payload: result });
      }
    } catch (err) {
      if (!controller.signal.aborted && !(err instanceof Error && err.name === 'AbortError')) {
        dispatch({
          type: 'FETCH_DATA_ERROR',
          payload: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        dispatch({ type: 'FETCH_DATA_DONE' });
      }
    }
  }, [
    state.draftEsqlQuery,
    timeRange,
    isApproximate,
    projectRouting,
    query,
    filters,
    esqlVariables,
    core.http,
    core.uiSettings,
    search,
  ]);

  const queryAbortRefs = useRef(new Map<number, AbortController>());
  useEffect(() => {
    const controllers = queryAbortRefs.current;
    return () => controllers.forEach((controller) => controller.abort());
  }, []);

  const fetchQueryData = useCallback(
    async (id: number) => {
      const text = state.additionalQueries.find((draft) => draft.id === id)?.text;
      if (!text?.trim()) return;

      queryAbortRefs.current.get(id)?.abort();
      const controller = new AbortController();
      queryAbortRefs.current.set(id, controller);

      dispatch({ type: 'FETCH_QUERY_START', id });

      try {
        const result = await fetchEsqlData(search, core.http, text, timeRange, controller.signal, {
          isApproximate,
          projectRouting,
          query,
          filters,
          esqlVariables,
          esQueryConfig: getEsQueryConfig(core.uiSettings),
        });
        if (!controller.signal.aborted) {
          dispatch({ type: 'FETCH_QUERY_SUCCESS', id, payload: result });
        }
      } catch (err) {
        if (!controller.signal.aborted && !(err instanceof Error && err.name === 'AbortError')) {
          dispatch({
            type: 'FETCH_QUERY_ERROR',
            id,
            payload: err instanceof Error ? err.message : String(err),
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          dispatch({ type: 'FETCH_QUERY_DONE', id });
        }
      }
    },
    [
      state.additionalQueries,
      timeRange,
      isApproximate,
      projectRouting,
      query,
      filters,
      esqlVariables,
      core.http,
      core.uiSettings,
      search,
    ]
  );

  const handleRender = useCallback(async () => {
    runPreviewAbortRef.current?.abort();
    const controller = new AbortController();
    runPreviewAbortRef.current = controller;

    const snapVersion = draftVersionRef.current;
    dispatch({ type: 'RENDER_START' });

    const fetchOptions = {
      isApproximate,
      projectRouting,
      query,
      filters,
      esqlVariables,
      esQueryConfig: getEsQueryConfig(core.uiSettings),
    };

    try {
      let rawHtml: string;
      const queries = getRunnableQueries(state.draftEsqlQuery, state.additionalQueries);
      if (queries.length > 0) {
        const results = await Promise.all(
          queries.map((queryToFetch, index) =>
            fetchEsqlData(
              search,
              core.http,
              queryToFetch,
              timeRange,
              controller.signal,
              fetchOptions
            ).catch((err: Error) => {
              // Say which query failed, but leave a single-query panel's message as it is.
              if (queries.length === 1 || err.name === 'AbortError') throw err;
              throw new Error(
                i18n.translate('xpack.customContent.editFlyout.queryFailed', {
                  defaultMessage: 'Query {position} failed: {message}',
                  values: { position: index + 1, message: err.message },
                })
              );
            })
          )
        );
        if (controller.signal.aborted) return;
        rawHtml = await fillTemplateDatasets(
          state.draftTemplate,
          results.map(({ columns, values }) => ({ columns, rows: values ?? [] }))
        );
      } else {
        rawHtml = state.draftTemplate;
      }
      if (!controller.signal.aborted && draftVersionRef.current === snapVersion) {
        onRunPreview(
          applyHtmlTheme(sanitizeHtml(rawHtml, getLinkBasePath(core.http)), colorMode, euiTheme)
        );
      }
    } catch (err) {
      if (!controller.signal.aborted && !(err instanceof Error && err.name === 'AbortError')) {
        dispatch({
          type: 'RENDER_ERROR',
          payload: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        dispatch({ type: 'RENDER_DONE' });
      }
    }
  }, [
    state.draftEsqlQuery,
    state.additionalQueries,
    state.draftTemplate,
    timeRange,
    isApproximate,
    projectRouting,
    query,
    filters,
    esqlVariables,
    core.http,
    core.uiSettings,
    search,
    colorMode,
    euiTheme,
    onRunPreview,
  ]);

  return {
    draftEsqlQuery: state.draftEsqlQuery,
    setDraftEsqlQuery,
    additionalQueries: state.additionalQueries,
    canAddQuery:
      Boolean(state.draftEsqlQuery.trim()) &&
      1 + state.additionalQueries.length < CUSTOM_CONTENT_MAX_ESQL_QUERIES,
    addQuery,
    removeQuery,
    setQueryText,
    fetchQueryData,
    draftTemplate: state.draftTemplate,
    setDraftTemplate,
    isAiAvailable,
    isDataLoading: state.isDataLoading,
    esqlData: state.esqlData,
    esqlDataError: state.esqlDataError,
    renderError: state.renderError,
    handleFetchData,
    isRenderLoading: state.isRenderLoading,
    handleRender,
  };
};
