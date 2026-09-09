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
  fetchEsqlData,
  fillTemplate,
  sanitizeHtml,
  applyHtmlTheme,
  type EsqlDataResult,
} from '@kbn/custom-content-renderer';
import { getServices } from '../services';
import { flyoutReducer } from './flyout_reducer';

export interface EditFlyoutState {
  draftEsqlQuery: string;
  setDraftEsqlQuery: (v: string) => void;
  draftTemplate: string;
  setDraftTemplate: (v: string) => void;
  isAiAvailable: boolean;
  isDataLoading: boolean;
  esqlData: EsqlDataResult | null;
  esqlDataError: string | null;
  handleFetchData: () => Promise<void>;
  isRenderLoading: boolean;
  handleRender: () => Promise<void>;
}

export interface UseEditFlyoutStateParams {
  esqlQuery: string | undefined;
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
    draftTemplate: template ?? '',
    isDataLoading: false,
    esqlData: null,
    esqlDataError: null,
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
      if (state.draftEsqlQuery) {
        const result = await fetchEsqlData(
          search,
          core.http,
          state.draftEsqlQuery,
          timeRange,
          controller.signal,
          fetchOptions
        );
        if (controller.signal.aborted) return;
        rawHtml = await fillTemplate(state.draftTemplate, result.columns, result.values ?? []);
      } else {
        rawHtml = state.draftTemplate;
      }
      if (!controller.signal.aborted && draftVersionRef.current === snapVersion) {
        onRunPreview(applyHtmlTheme(sanitizeHtml(rawHtml), colorMode, euiTheme));
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
        dispatch({ type: 'RENDER_DONE' });
      }
    }
  }, [
    state.draftEsqlQuery,
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
    draftTemplate: state.draftTemplate,
    setDraftTemplate,
    isAiAvailable,
    isDataLoading: state.isDataLoading,
    esqlData: state.esqlData,
    esqlDataError: state.esqlDataError,
    handleFetchData,
    isRenderLoading: state.isRenderLoading,
    handleRender,
  };
};
