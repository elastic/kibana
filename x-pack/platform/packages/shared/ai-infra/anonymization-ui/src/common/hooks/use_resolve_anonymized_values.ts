/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceTokensWithOriginals } from '@kbn/anonymization-common';
import { useMemo } from 'react';
import type { InlineDeanonymizationEntry, TokenToOriginalMap } from '../types/replacements';
import type { AnonymizationReplacementsClient } from '../services/replacements/client';
import { useGetReplacements } from '../services/replacements/hooks/use_get_replacements';

interface UseResolveAnonymizedValuesParams {
  client: AnonymizationReplacementsClient;
  replacementsId?: string;
  inlineDeanonymizations?: InlineDeanonymizationEntry[];
  enabled?: boolean;
}

export interface ResolveAnonymizedValuesResult {
  tokenToOriginalMap: TokenToOriginalMap;
  resolveText: (value: string) => string;
  isLoading: boolean;
  error?: Error;
}

const toInlineTokenMap = (
  inlineDeanonymizations: InlineDeanonymizationEntry[] = []
): TokenToOriginalMap =>
  Object.fromEntries(
    inlineDeanonymizations
      .filter(
        (entry) =>
          typeof entry.entity?.mask === 'string' &&
          entry.entity.mask.length > 0 &&
          typeof entry.entity?.value === 'string'
      )
      .map((entry) => [entry.entity.mask, entry.entity.value])
  );

export const useResolveAnonymizedValues = ({
  client,
  replacementsId,
  inlineDeanonymizations,
  enabled = true,
}: UseResolveAnonymizedValuesParams): ResolveAnonymizedValuesResult => {
  const inlineTokenMap = useMemo(
    () => toInlineTokenMap(inlineDeanonymizations),
    [inlineDeanonymizations]
  );
  const replacementsQuery = useGetReplacements({
    client,
    replacementsId,
    enabled,
  });

  const replacementsTokenMap = useMemo(
    () =>
      Object.fromEntries(
        (replacementsQuery.data?.replacements ?? []).map((replacement) => [
          replacement.anonymized,
          replacement.original,
        ])
      ),
    [replacementsQuery.data?.replacements]
  );

  // Replacements API data has priority over inline metadata when both are available.
  const tokenToOriginalMap = useMemo(
    () => ({
      ...inlineTokenMap,
      ...replacementsTokenMap,
    }),
    [inlineTokenMap, replacementsTokenMap]
  );

  const resolveText = useMemo(
    () => (value: string) => replaceTokensWithOriginals(value, tokenToOriginalMap),
    [tokenToOriginalMap]
  );

  return {
    tokenToOriginalMap,
    resolveText,
    isLoading: replacementsQuery.isLoading,
    error: replacementsQuery.error as Error | undefined,
  };
};
