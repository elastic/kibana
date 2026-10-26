/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { FieldRule, RegexRule } from '@kbn/anonymization-common';
import type { FetchPreviewDocument } from '../../contracts';
import { buildLocalPreviewDocument, buildLocalPreviewRows, type PreviewRow } from './preview';
import type { TargetType } from '../types';
import { isObjectRecord } from '../../common/utils/is_object_record';
import { SAMPLE_PREVIEW_DOCUMENT } from '../constants';
import { usePreviewDocumentLoader } from './use_preview_document_loader';

export type PreviewViewMode = 'table' | 'json';
export type PreviewValueMode = 'original' | 'tokens';

interface UsePreviewPanelStateParams {
  fieldRules: FieldRule[];
  regexRules: RegexRule[];
  isSubmitting: boolean;
  targetType: TargetType;
  targetId: string;
  fetchPreviewDocument?: FetchPreviewDocument;
}

export interface UsePreviewPanelStateResult {
  previewInput: string;
  setPreviewInput: (value: string) => void;
  previewViewMode: PreviewViewMode;
  setPreviewViewMode: (value: PreviewViewMode) => void;
  previewValueMode: PreviewValueMode;
  setPreviewValueMode: (value: PreviewValueMode) => void;
  parsedPreviewDocument?: Record<string, unknown>;
  previewRows: PreviewRow[];
  transformedPreviewDocument?: Record<string, unknown>;
  isLoadingPreviewDocument: boolean;
  previewDocumentLoadError?: string;
  previewDocumentSource: 'target' | 'fallback';
  isControlsDisabled: boolean;
  isInvalidPreviewJson: boolean;
  isEmptyPreviewRows: boolean;
}

export const usePreviewPanelState = ({
  fieldRules,
  regexRules,
  isSubmitting,
  targetType,
  targetId,
  fetchPreviewDocument,
}: UsePreviewPanelStateParams): UsePreviewPanelStateResult => {
  const [previewInput, setPreviewInput] = useState(
    JSON.stringify(SAMPLE_PREVIEW_DOCUMENT, null, 2)
  );
  const [previewViewMode, setPreviewViewMode] = useState<PreviewViewMode>('table');
  const [previewValueMode, setPreviewValueMode] = useState<PreviewValueMode>('original');

  const onPreviewDocumentLoaded = useCallback((document: Record<string, unknown>) => {
    setPreviewInput(JSON.stringify(document, null, 2));
  }, []);

  const { isLoadingPreviewDocument, previewDocumentLoadError, previewDocumentSource } =
    usePreviewDocumentLoader({
      targetType,
      targetId,
      fetchPreviewDocument,
      onPreviewDocumentLoaded,
    });

  const parsedPreviewDocument = useMemo(() => {
    try {
      const parsed = JSON.parse(previewInput);
      return isObjectRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [previewInput]);

  const previewRows = useMemo(
    () =>
      parsedPreviewDocument
        ? buildLocalPreviewRows({ document: parsedPreviewDocument, fieldRules, regexRules })
        : [],
    [fieldRules, parsedPreviewDocument, regexRules]
  );

  const transformedPreviewDocument = useMemo(
    () =>
      parsedPreviewDocument
        ? buildLocalPreviewDocument({ document: parsedPreviewDocument, fieldRules, regexRules })
        : undefined,
    [fieldRules, parsedPreviewDocument, regexRules]
  );

  return {
    previewInput,
    setPreviewInput,
    previewViewMode,
    setPreviewViewMode,
    previewValueMode,
    setPreviewValueMode,
    parsedPreviewDocument,
    previewRows,
    transformedPreviewDocument,
    isLoadingPreviewDocument,
    previewDocumentLoadError,
    previewDocumentSource,
    isControlsDisabled: isSubmitting || isLoadingPreviewDocument,
    isInvalidPreviewJson: parsedPreviewDocument === undefined,
    isEmptyPreviewRows: parsedPreviewDocument !== undefined && previewRows.length === 0,
  };
};
