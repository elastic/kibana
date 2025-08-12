/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CaseUI } from '../../../../common';
import { getCaseSuggestions } from '../../../containers/api';
import { useCasesContext } from '../../cases_context/use_cases_context';

export const useFetchSuggestion = ({ caseData }: { caseData: CaseUI }) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['suggestions', caseData.id],
    queryFn: () => getCaseSuggestions({ caseId: caseData.id }),
    refetchOnWindowFocus: false,
  });

  return {
    isLoadingSuggestions: isLoading,
    suggestions: data?.suggestions || [],
    refetchSuggestions: refetch,
  };
};

export const CaseSuggestions = React.memo(({ caseData }: { caseData: CaseUI }) => {
  const { suggestions, isLoadingSuggestions } = useFetchSuggestion({ caseData });

  const { attachmentSuggestionRegistry } = useCasesContext();
  const components = attachmentSuggestionRegistry.list();

  if (isLoadingSuggestions) {
    return <EuiLoadingSpinner size="m" />;
  }

  return (
    <EuiFlexItem>
      {suggestions.map((suggestion) => {
        const component = components.find((c) => c.id === suggestion.id);
        if (!component) return null;
        return <component.children key={suggestion.id} suggestion={suggestion} />;
      })}
    </EuiFlexItem>
  );
});

CaseSuggestions.displayName = 'CaseSuggestions';
