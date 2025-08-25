/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CaseUI } from '../../../common';
import { useCasesContext } from '../cases_context/use_cases_context';
import { getCaseSuggestions } from '../../containers/api';

const MAX_SUGGESTIONS = 2;

export const useCaseSuggestions = ({ caseData }: { caseData: CaseUI }) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['suggestions', caseData.id],
    queryFn: () => getCaseSuggestions({ caseId: caseData.id }),
    refetchOnWindowFocus: false,
  });

  const { attachmentSuggestionRegistry } = useCasesContext();

  const componentById = useMemo(
    () =>
      new Map(
        attachmentSuggestionRegistry
          .list()
          .map((suggestion) => [suggestion.id, suggestion.children])
      ),
    [attachmentSuggestionRegistry]
  );

  const visibleSuggestions = useMemo(
    () =>
      (data?.suggestions || [])
        .filter(({ id }) => !dismissedIds.includes(id))
        .slice(0, MAX_SUGGESTIONS),
    [data?.suggestions, dismissedIds]
  );

  return {
    isLoadingSuggestions: isLoading,
    visibleSuggestions,
    setDismissedIds,
    componentById,
  };
};
