/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AttachmentItem } from '../../../common/types/domain';
import type { CaseUI } from '../../../common';
import { useCasesContext } from '../cases_context/use_cases_context';
import { getCaseSuggestions } from '../../containers/api';
import type { SuggestionType } from '../../client/attachment_framework/types';

const MAX_SUGGESTIONS = 2;

export const useCaseSuggestions = ({ caseData }: { caseData: CaseUI }) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['suggestions', caseData.id],
    queryFn: () => getCaseSuggestions({ caseId: caseData.id }),
    refetchOnWindowFocus: false,
  });

  const { attachmentSuggestionRegistry } = useCasesContext();

  const componentById = useMemo(
    () =>
      new Map(attachmentSuggestionRegistry.list().map((component) => [component.id, component])),
    [attachmentSuggestionRegistry]
  );

  const suggestionAttachmentsWithInjectedComponent: (AttachmentItem & {
    injectedComponent: SuggestionType['children'];
  })[] = useMemo(() => {
    return (data?.suggestions ?? []).flatMap((suggestion) => {
      const component = componentById.get(suggestion.id);
      if (!component) {
        // TODO: if the suggestion component is not found, we should log an error
        return [];
      }
      return suggestion.data.map((d) => ({
        ...d,
        injectedComponent: component.children,
      }));
    });
  }, [data?.suggestions, componentById]);

  const visibleSuggestions = useMemo(
    () =>
      suggestionAttachmentsWithInjectedComponent
        .filter(({ id }) => !dismissedIds.includes(id))
        .slice(0, MAX_SUGGESTIONS),
    [suggestionAttachmentsWithInjectedComponent, dismissedIds]
  );

  const onDismissSuggestion = useCallback(
    (id: string) => setDismissedIds((prev) => [...prev, id]),
    [setDismissedIds]
  );

  return {
    isLoadingSuggestions: isLoading,
    visibleSuggestions,
    refetchSuggestions: refetch,
    onDismissSuggestion,
  };
};
