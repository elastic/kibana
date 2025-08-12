/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import React from 'react';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { useQuery } from '@tanstack/react-query';
import type { SuggestionResponse } from '../../../../common';
import { useCasesContext } from '../../cases_context/use_cases_context';

const MOCK_SERVICE_NAME = 'slo';

const fetchSuggestions = async ({
  http,
  serviceName,
}: {
  http: HttpSetup;
  serviceName: string;
}): Promise<SuggestionResponse<Record<string, unknown>>> => {
  return http.post<SuggestionResponse<Record<string, unknown>>>(
    '/internal/case_suggestions/_find',
    {
      body: JSON.stringify({
        owners: ['observability'],
        context: {
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
          'service.name': serviceName,
        },
      }),
    }
  );
};

export const getSuggestionsQueryKey = (serviceName: string) => ['suggestions', serviceName];

export const useFetchSuggestion = (serviceName: string) => {
  const { http } = useKibana().services;

  const { data, isLoading, refetch } = useQuery({
    queryKey: getSuggestionsQueryKey(serviceName),
    queryFn: () => fetchSuggestions({ http, serviceName }),
    refetchOnWindowFocus: false,
  });

  return {
    isLoadingSloSuggestions: isLoading,
    suggestions: data?.suggestions || [],
    refetchSuggestions: refetch,
  };
};

export const Suggestions = React.memo(() => {
  const { suggestions, isLoadingSloSuggestions } = useFetchSuggestion(MOCK_SERVICE_NAME);

  const { attachmentSuggestionRegistry } = useCasesContext();
  const components = attachmentSuggestionRegistry.list();

  if (isLoadingSloSuggestions) {
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
