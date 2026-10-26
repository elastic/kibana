/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { FetchPreviewDocument, PreviewTargetType } from '../../contracts';

export interface UsePreviewDocumentLoaderParams {
  targetType: PreviewTargetType;
  targetId: string;
  fetchPreviewDocument?: FetchPreviewDocument;
  onPreviewDocumentLoaded: (document: Record<string, unknown>) => void;
}

export interface UsePreviewDocumentLoaderResult {
  isLoadingPreviewDocument: boolean;
  previewDocumentLoadError?: string;
  previewDocumentSource: 'target' | 'fallback';
}

const NO_DOCUMENT_FOUND_MESSAGE = i18n.translate(
  'anonymizationUi.profiles.preview.noDocumentFound',
  {
    defaultMessage:
      'No readable document sample was found for the selected target. Using the local sample document instead.',
  }
);

const LOAD_DOCUMENT_FAILED_MESSAGE = i18n.translate(
  'anonymizationUi.profiles.preview.loadDocumentFailed',
  {
    defaultMessage:
      'Unable to load a document sample for the selected target. Using the local sample document instead.',
  }
);

export const usePreviewDocumentLoader = ({
  targetType,
  targetId,
  fetchPreviewDocument,
  onPreviewDocumentLoaded,
}: UsePreviewDocumentLoaderParams): UsePreviewDocumentLoaderResult => {
  const trimmedTargetId = targetId.trim();
  const isEnabled = Boolean(fetchPreviewDocument && trimmedTargetId);

  const query = useQuery<Record<string, unknown> | null | undefined>({
    queryKey: ['anonymizationProfilesPreviewDocument', targetType, trimmedTargetId],
    queryFn: async () => {
      if (!fetchPreviewDocument) {
        return undefined;
      }
      return fetchPreviewDocument({
        targetType,
        targetId: trimmedTargetId,
      });
    },
    enabled: isEnabled,
    retry: false,
    refetchOnWindowFocus: false,
    onSuccess: (previewDocument) => {
      if (previewDocument) {
        onPreviewDocumentLoaded(previewDocument);
      }
    },
  });

  const previewDocumentSource: UsePreviewDocumentLoaderResult['previewDocumentSource'] =
    isEnabled && query.isSuccess && query.data ? 'target' : 'fallback';

  let previewDocumentLoadError: string | undefined;
  if (isEnabled) {
    if (query.isError) {
      previewDocumentLoadError = LOAD_DOCUMENT_FAILED_MESSAGE;
    } else if (query.isSuccess && !query.data) {
      previewDocumentLoadError = NO_DOCUMENT_FOUND_MESSAGE;
    }
  }

  return {
    isLoadingPreviewDocument: isEnabled && query.isLoading,
    previewDocumentLoadError,
    previewDocumentSource,
  };
};
