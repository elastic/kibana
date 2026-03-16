/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { replaceTokensWithOriginals } from '@kbn/anonymization-common';
import {
  createAnonymizationReplacementsClient,
  useResolveAnonymizedValues,
} from '@kbn/anonymization-ui';
import { useReplacementsHold } from './use_replacements_hold';

interface UseResolvedMessageContentParams {
  content: string;
  hasHttp: boolean;
  anonymizationEnabled: boolean;
  http?: Parameters<typeof createAnonymizationReplacementsClient>[0];
  replacementsId?: string;
  holdContentWhileResolvingReplacements: boolean;
  holdContentMaxMs: number;
  showAnonymized: boolean;
}

export const useResolvedMessageContent = ({
  content,
  hasHttp,
  anonymizationEnabled,
  http,
  replacementsId,
  holdContentWhileResolvingReplacements,
  holdContentMaxMs,
  showAnonymized,
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

  // Fetch replacements when anonymization is active and a replacementsId is present.
  // showAnonymized=true: skip the fetch — raw stored content (tokens) is the desired output.
  // showAnonymized=false (default): apply token→original substitution for UI display.
  const resolveEnabled = Boolean(
    anonymizationEnabled && hasHttp && replacementsId && !showAnonymized
  );

  const {
    tokenToOriginalMap,
    isLoading: isResolvingReplacements,
    error: replacementsError,
  } = useResolveAnonymizedValues({
    client: replacementsClient,
    replacementsId,
    enabled: resolveEnabled,
  });

  const shouldHoldContent = useReplacementsHold({
    holdEnabled: holdContentWhileResolvingReplacements && !showAnonymized,
    holdMaxMs: holdContentMaxMs,
    hasHttp,
    replacementsId,
    isResolvingReplacements,
  });

  const displayContent = useMemo(() => {
    // Show anonymized: return raw stored content (tokens) without any substitution.
    if (showAnonymized || !anonymizationEnabled || !hasHttp || !replacementsId) return content;
    if (shouldHoldContent) return '';
    if (isResolvingReplacements || replacementsError) return content;
    return replaceTokensWithOriginals(content, tokenToOriginalMap);
  }, [
    content,
    showAnonymized,
    anonymizationEnabled,
    hasHttp,
    replacementsId,
    shouldHoldContent,
    isResolvingReplacements,
    replacementsError,
    tokenToOriginalMap,
  ]);

  return {
    displayContent,
    isResolvingReplacements,
    replacementsError,
    shouldHoldContent,
  };
};
