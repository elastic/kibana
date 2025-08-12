/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCaseSuggestions } from '../../../containers/api';
import { useCasesContext } from '../../cases_context/use_cases_context';

const MOCK_SERVICE_NAME = 'slo';

export const getSuggestionsQueryKey = (serviceName: string) => ['suggestions', serviceName];

export const useFetchSuggestion = (serviceName: string) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: getSuggestionsQueryKey(serviceName),
    queryFn: () =>
      getCaseSuggestions({
        owners: ['observability'],
        context: {
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
          'service.name': serviceName,
        },
      }),
    refetchOnWindowFocus: false,
  });

  return {
    isLoadingSuggestions: isLoading,
    suggestions: data?.suggestions || [],
    refetchSuggestions: refetch,
  };
};

export const Suggestions = React.memo(() => {
  const { suggestions, isLoadingSuggestions } = useFetchSuggestion(MOCK_SERVICE_NAME);

  const { attachmentSuggestionRegistry } = useCasesContext();
  const components = attachmentSuggestionRegistry.list();

  if (isLoadingSuggestions) {
    return <EuiLoadingSpinner size="m" />;
  }

  return (
    <div>
      {suggestions.map((suggestion) => {
        const component = components.find((c) => c.id === suggestion.id);
        if (!component) return null;
        return <component.children key={suggestion.id} suggestion={suggestion} />;
      })}
    </div>
  );
});

Suggestions.displayName = 'Suggestions';
