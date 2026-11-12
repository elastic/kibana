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
import {
  getLinkBasePath,
  fetchEsqlData,
  fetchEsqlDatasets,
  fillTemplateDatasets,
  sanitizeHtml,
  applyHtmlTheme,
} from '@kbn/custom-content-renderer';
import { CUSTOM_CONTENT_MAX_ESQL_QUERIES } from '@kbn/custom-content-common';
import { getServices } from '../services';
import { findEmptyQueryPosition, getRunnableQueries } from '../utils/get_runnable_queries';
import { createDraftQuery, flyoutReducer } from './flyout_reducer';
import type { DraftQuery } from './flyout_reducer';

export interface EditFlyoutState {
  /** The queries being edited, the first of which is `rows` in the template. Never empty. */
  draftQueries: DraftQuery[];
  /** The queries the draft will run and save: the ones filled in, none without a first query. */
  draftEsqlQueries: string[];
  /** The position of a blank query that others follow, which blocks applying and previewing. */
  emptyQueryPosition: number | undefined;
  canAddQuery: boolean;
  addQuery: () => void;
  removeQuery: (id: number) => void;
  setQueryText: (id: number, text: string) => void;
  fetchQueryData: (id: number) => Promise<void>;
  draftTemplate: string;
  setDraftTemplate: (v: string) => void;
  isAiAvailable: boolean;
  renderError: string | null;
  isRenderLoading: boolean;
  handleRender: () => Promise<void>;
}

export interface UseEditFlyoutStateParams {
  /** The panel's queries, the first of which is `rows` in its template. */
  esqlQueries: readonly string[];
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
  esqlQueries,
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
  const [state, dispatch] = useReducer(flyoutReducer, undefined, () => {
    // A panel with no query still has a first one to type into.
    const texts = esqlQueries.length > 0 ? esqlQueries : [''];
    return {
      draftQueries: texts.map((text, id) => createDraftQuery(id, text)),
      nextQueryId: texts.length,
      draftTemplate: template ?? '',
      isRenderLoading: false,
      renderError: null,
    };
  });

  const queryAbortRefs = useRef(new Map<number, AbortController>());
  const runPreviewAbortRef = useRef<AbortController | undefined>(undefined);
  const draftVersionRef = useRef(0);

  useEffect(() => {
    const controllers = queryAbortRefs.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      runPreviewAbortRef.current?.abort();
    };
  }, []);

  const { agentBuilder, core, search } = getServices();
  const isAiAvailable = Boolean(agentBuilder);

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
    queryAbortRefs.current.get(id)?.abort();
    queryAbortRefs.current.delete(id);
    dispatch({ type: 'REMOVE_QUERY', id });
  }, []);
  const setQueryText = useCallback((id: number, text: string) => {
    draftVersionRef.current += 1;
    dispatch({ type: 'SET_QUERY_TEXT', id, payload: text });
  }, []);

  const fetchQueryData = useCallback(
    async (id: number) => {
      const text = state.draftQueries.find((draft) => draft.id === id)?.text;
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
      state.draftQueries,
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

  const draftEsqlQueries = getRunnableQueries(state.draftQueries);
  const emptyQueryPosition = findEmptyQueryPosition(state.draftQueries);

  const handleRender = useCallback(async () => {
    runPreviewAbortRef.current?.abort();
    const controller = new AbortController();
    runPreviewAbortRef.current = controller;

    const snapVersion = draftVersionRef.current;
    dispatch({ type: 'RENDER_START' });

    try {
      let rawHtml: string;
      // The preview has to show what applying the template will, so every query the draft has is
      // fetched, not only the one being edited.
      const queries = getRunnableQueries(state.draftQueries);
      if (queries.length > 0) {
        const { datasets } = await fetchEsqlDatasets(
          search,
          core.http,
          queries,
          timeRange,
          controller.signal,
          {
            isApproximate,
            projectRouting,
            query,
            filters,
            esqlVariables,
            esQueryConfig: getEsQueryConfig(core.uiSettings),
          }
        );
        if (controller.signal.aborted) return;
        rawHtml = await fillTemplateDatasets(state.draftTemplate, datasets);
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
    state.draftQueries,
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
    draftQueries: state.draftQueries,
    draftEsqlQueries,
    emptyQueryPosition,
    canAddQuery:
      Boolean(state.draftQueries[0]?.text.trim()) &&
      state.draftQueries.length < CUSTOM_CONTENT_MAX_ESQL_QUERIES,
    addQuery,
    removeQuery,
    setQueryText,
    fetchQueryData,
    draftTemplate: state.draftTemplate,
    setDraftTemplate,
    isAiAvailable,
    renderError: state.renderError,
    isRenderLoading: state.isRenderLoading,
    handleRender,
  };
};
