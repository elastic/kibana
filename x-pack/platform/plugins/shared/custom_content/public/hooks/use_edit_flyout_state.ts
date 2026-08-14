/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useRef } from 'react';
import type { EuiThemeColorModeStandard } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { getServices } from '../services';
import { fetchEsqlData, type EsqlDataResult } from '../utils/fetch_esql_data';
import { fillTemplate } from '../utils/fill_template';
import { prepareHtml } from '../utils/prepare_html';
import { flyoutReducer } from './flyout_reducer';

export interface EditFlyoutState {
  draftEsqlQuery: string;
  setDraftEsqlQuery: (v: string) => void;
  draftTemplate: string;
  setDraftTemplate: (v: string) => void;
  isAiAvailable: boolean;
  isPreviewLoading: boolean;
  previewData: EsqlDataResult | null;
  previewError: string | null;
  handlePreview: () => Promise<void>;
  isRunPreviewLoading: boolean;
  runPreviewError: string | null;
  handleRunPreview: () => Promise<void>;
}

export interface UseEditFlyoutStateParams {
  esqlQuery: string | undefined;
  template: string | undefined;
  timeRange: TimeRange | undefined;
  colorMode: EuiThemeColorModeStandard;
  onRunPreview: (html: string) => void;
}

export const useEditFlyoutState = ({
  esqlQuery,
  template,
  timeRange,
  colorMode,
  onRunPreview,
}: UseEditFlyoutStateParams): EditFlyoutState => {
  const [state, dispatch] = useReducer(flyoutReducer, {
    draftEsqlQuery: esqlQuery ?? '',
    draftTemplate: template ?? '',
    isPreviewLoading: false,
    previewData: null,
    previewError: null,
    isRunPreviewLoading: false,
    runPreviewError: null,
  });

  const abortRef = useRef<AbortController | undefined>(undefined);
  const runPreviewAbortRef = useRef<AbortController | undefined>(undefined);

  const { agentBuilder, core, search } = getServices();
  const isAiAvailable = Boolean(agentBuilder);

  const setDraftEsqlQuery = useCallback(
    (v: string) => dispatch({ type: 'SET_ESQL_QUERY', payload: v }),
    []
  );
  const setDraftTemplate = useCallback(
    (v: string) => dispatch({ type: 'SET_TEMPLATE', payload: v }),
    []
  );

  const handlePreview = useCallback(async () => {
    if (!state.draftEsqlQuery) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: 'PREVIEW_START' });

    try {
      const result = await fetchEsqlData(
        search,
        core.http,
        state.draftEsqlQuery,
        timeRange,
        controller.signal
      );
      if (!controller.signal.aborted) {
        dispatch({ type: 'PREVIEW_SUCCESS', payload: result });
      }
    } catch (err) {
      if (!controller.signal.aborted && !(err instanceof Error && err.name === 'AbortError')) {
        dispatch({
          type: 'PREVIEW_ERROR',
          payload: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        dispatch({ type: 'PREVIEW_DONE' });
      }
    }
  }, [state.draftEsqlQuery, timeRange, core.http, search]);

  const handleRunPreview = useCallback(async () => {
    runPreviewAbortRef.current?.abort();
    const controller = new AbortController();
    runPreviewAbortRef.current = controller;

    dispatch({ type: 'RUN_PREVIEW_START' });

    try {
      let rawHtml: string;
      if (state.draftEsqlQuery) {
        const result = await fetchEsqlData(
          search,
          core.http,
          state.draftEsqlQuery,
          timeRange,
          controller.signal
        );
        if (controller.signal.aborted) return;
        rawHtml = await fillTemplate(state.draftTemplate, result.columns, result.values ?? []);
      } else {
        rawHtml = state.draftTemplate;
      }
      if (!controller.signal.aborted) {
        onRunPreview(prepareHtml(rawHtml, colorMode));
      }
    } catch (err) {
      if (!controller.signal.aborted && !(err instanceof Error && err.name === 'AbortError')) {
        dispatch({
          type: 'RUN_PREVIEW_ERROR',
          payload: err instanceof Error ? err.message : String(err),
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        dispatch({ type: 'RUN_PREVIEW_DONE' });
      }
    }
  }, [
    state.draftEsqlQuery,
    state.draftTemplate,
    timeRange,
    core.http,
    search,
    colorMode,
    onRunPreview,
  ]);

  return {
    draftEsqlQuery: state.draftEsqlQuery,
    setDraftEsqlQuery,
    draftTemplate: state.draftTemplate,
    setDraftTemplate,
    isAiAvailable,
    isPreviewLoading: state.isPreviewLoading,
    previewData: state.previewData,
    previewError: state.previewError,
    handlePreview,
    isRunPreviewLoading: state.isRunPreviewLoading,
    runPreviewError: state.runPreviewError,
    handleRunPreview,
  };
};
