/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiSkeletonCircle,
  EuiSkeletonTitle,
  EuiSkeletonText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { createRepositoryClient, isRequestAbortedError } from '@kbn/server-route-repository-client';
import { Suggestion } from './suggestion';
import { useKibana } from '../../../../common/lib/kibana';

interface SuggestionsProps {}

export const Suggestions: React.FC<SuggestionProps> = (props: SuggestionsProps) => {
  const {
    services: { http, notifications, observabilityCaseSuggestionRegistry },
  } = useKibana();
  console.log('observabilityCaseSuggestionRegistry:', observabilityCaseSuggestionRegistry);
  const controllerRef = useRef(new AbortController());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const finalSuggestionEvent = events.find(
    (event) => event.event.name === 'finalizeSuggestionsForCase'
  );
  const suggestions = finalSuggestionEvent?.event?.response?.suggestions || [];

  const repositoryClient = useMemo(() => createRepositoryClient({ http }), [http]);

  useEffect(() => {
    repositoryClient
      .stream('POST /internal/observability/investigation/case_suggestions', {
        params: {
          body: {
            connectorId: 'azure-gpt4',
            rangeFrom: '2025-06-29T14:00:00.000Z',
            rangeTo: '2025-07-01T14:24:05.867Z',
            serviceName: 'checkout',
          },
        },
        signal: controllerRef.current.signal,
      })
      .subscribe({
        next: (event) => {
          console.log('Received event:', event);
          setEvents((prevEvents) => [...prevEvents, event]);
          setIsLoading(true);
        },
        error: (error) => {
          if (!isRequestAbortedError(error)) {
            notifications.toasts.addError(error, {
              title: 'Error fetching case suggestions',
            });
            setError(nextError);
          } else {
            setError(new Error('Request aborted'));
          }
        },
        complete: () => {
          setIsLoading(false);
        },
      });
  }, [repositoryClient, notifications.toasts]);

  if (isLoading) {
    return (
      <EuiPanel>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiSkeletonCircle size="s" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSkeletonTitle size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiSkeletonText lines={5} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return (
    <>
      {suggestions.length > 0 &&
        suggestions.map((suggestion) => (
          <Suggestion key={suggestion.suggestionId} suggestion={suggestion} />
        ))}
    </>
  );
};

Suggestions.displayName = 'Suggestions';
