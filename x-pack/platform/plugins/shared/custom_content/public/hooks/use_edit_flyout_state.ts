/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useRef } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { getServices } from '../services';
import { fetchEsqlData, type EsqlDataResult } from '../utils/fetch_esql_data';

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
}

export interface UseEditFlyoutStateParams {
  esqlQuery: string | undefined;
  template: string | undefined;
  timeRange: TimeRange | undefined;
}

export const useEditFlyoutState = ({
  esqlQuery,
  template,
  timeRange,
}: UseEditFlyoutStateParams): EditFlyoutState => {
  const [draftEsqlQuery, setDraftEsqlQuery] = useState(esqlQuery ?? '');
  const [draftTemplate, setDraftTemplate] = useState(template ?? '');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<EsqlDataResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | undefined>(undefined);

  const { agentBuilder, core, search } = getServices();
  const isAiAvailable = Boolean(agentBuilder);

  const handlePreview = useCallback(async () => {
    if (!draftEsqlQuery) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsPreviewLoading(true);
    setPreviewError(null);

    try {
      const result = await fetchEsqlData(
        search,
        core.http,
        draftEsqlQuery,
        timeRange,
        controller.signal
      );
      if (!controller.signal.aborted) {
        setPreviewData(result);
      }
    } catch (err) {
      if (!controller.signal.aborted && !(err instanceof Error && err.name === 'AbortError')) {
        setPreviewError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsPreviewLoading(false);
      }
    }
  }, [draftEsqlQuery, timeRange, core.http, search]);

  return {
    draftEsqlQuery,
    setDraftEsqlQuery,
    draftTemplate,
    setDraftTemplate,
    isAiAvailable,
    isPreviewLoading,
    previewData,
    previewError,
    handlePreview,
  };
};
