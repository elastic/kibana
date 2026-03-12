/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  createAnonymizationReplacementsClient,
  useResolveAnonymizedValues,
} from '@kbn/anonymization-ui';
import { useReplacementsHold } from './use_replacements_hold';

interface UseResolvedMessageContentParams {
  content: string;
  hasHttp: boolean;
  http?: Parameters<typeof createAnonymizationReplacementsClient>[0];
  replacementsId?: string;
  holdContentWhileResolvingReplacements: boolean;
  holdContentMaxMs: number;
}

export const useResolvedMessageContent = ({
  content,
  hasHttp,
  http,
  replacementsId,
  holdContentWhileResolvingReplacements,
  holdContentMaxMs,
}: UseResolvedMessageContentParams) => {
  const replacementsClient = useMemo(() => {
    if (http) {
      return createAnonymizationReplacementsClient(http);
    }
    const noHttpError = new Error('HTTP service unavailable');
    return {
      getReplacements: async () => Promise.reject(noHttpError),
      deanonymizeText: async () => Promise.reject(noHttpError),
      getTokenToOriginalMap: async () => Promise.reject(noHttpError),
    };
  }, [http]);

  const {
    resolveText,
    isLoading: isResolvingReplacements,
    error: replacementsError,
  } = useResolveAnonymizedValues({
    client: replacementsClient,
    replacementsId,
    enabled: Boolean(hasHttp && replacementsId),
  });

  const shouldHoldContent = useReplacementsHold({
    holdEnabled: holdContentWhileResolvingReplacements,
    holdMaxMs: holdContentMaxMs,
    hasHttp,
    replacementsId,
    isResolvingReplacements,
  });

  const displayContent = useMemo(() => {
    if (shouldHoldContent) {
      return '';
    }
    if (!hasHttp || !replacementsId || isResolvingReplacements || replacementsError) {
      return content;
    }
    return resolveText(content);
  }, [
    content,
    hasHttp,
    isResolvingReplacements,
    replacementsError,
    replacementsId,
    resolveText,
    shouldHoldContent,
  ]);

  return {
    displayContent,
    isResolvingReplacements,
    replacementsError,
    shouldHoldContent,
  };
};
