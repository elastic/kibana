/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getESQLTimeFieldFromQuery } from '@kbn/esql-utils';
import { getServices } from '../services';
import { fetchEsqlData } from '../utils/fetch_esql_data';
import type { EsqlDataResult } from '../utils/fetch_esql_data';

export interface EditFlyoutState {
  draftPrompt: string;
  setDraftPrompt: (v: string) => void;
  draftEsqlQuery: string;
  setDraftEsqlQuery: (v: string) => void;
  draftTemplate: string;
  setDraftTemplate: (v: string) => void;
  detectedTimeField: string | undefined;
  isAiAvailable: boolean | undefined;
  isPreviewLoading: boolean;
  previewData: EsqlDataResult | null;
  previewError: string | null;
  handlePreview: () => Promise<void>;
}

interface UseEditFlyoutStateParams {
  prompt: string;
  esqlQuery: string | undefined;
  template: string | undefined;
  timeRange: { from: string; to: string } | undefined;
}

export function useEditFlyoutState({
  prompt,
  esqlQuery,
  template,
  timeRange,
}: UseEditFlyoutStateParams): EditFlyoutState {
  const [draftPrompt, setDraftPrompt] = useState(prompt);
  const [draftEsqlQuery, setDraftEsqlQueryRaw] = useState(esqlQuery ?? '');
  const [draftTemplate, setDraftTemplate] = useState(template ?? '');
  const [detectedTimeField, setDetectedTimeField] = useState<string | undefined>(undefined);
  const [isAiAvailable, setIsAiAvailable] = useState<boolean | undefined>(undefined);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<EsqlDataResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getServices()
      .core.http.get<{ connectors: unknown[] }>('/internal/inference/connectors')
      .then((res) => {
        if (!cancelled) setIsAiAvailable(res.connectors.length > 0);
      })
      .catch(() => {
        if (!cancelled) setIsAiAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!draftEsqlQuery.trim()) {
      setDetectedTimeField(undefined);
      return;
    }
    debounceRef.current = setTimeout(() => {
      getESQLTimeFieldFromQuery({ query: draftEsqlQuery, http: getServices().core.http }).then(
        setDetectedTimeField
      );
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [draftEsqlQuery]);

  const setDraftEsqlQuery = useCallback((q: string) => {
    setDraftEsqlQueryRaw(q);
    setPreviewData(null);
    setPreviewError(null);
  }, []);

  const handlePreview = useCallback(async () => {
    if (!draftEsqlQuery.trim()) return;
    setIsPreviewLoading(true);
    setPreviewData(null);
    setPreviewError(null);
    try {
      const controller = new AbortController();
      const result = await fetchEsqlData(
        getServices().search,
        getServices().core.http,
        draftEsqlQuery,
        timeRange,
        controller.signal
      );
      setPreviewData(result);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPreviewLoading(false);
    }
  }, [draftEsqlQuery, timeRange]);

  return {
    draftPrompt,
    setDraftPrompt,
    draftEsqlQuery,
    setDraftEsqlQuery,
    draftTemplate,
    setDraftTemplate,
    detectedTimeField,
    isAiAvailable,
    isPreviewLoading,
    previewData,
    previewError,
    handlePreview,
  };
}
