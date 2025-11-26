/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { StreamlangDSL } from '@kbn/streamlang';
import { useStreamEnrichmentSelector, useStreamEnrichmentEvents } from './use_stream_enrichment';

export interface SuggestPipelineState {
  loading: boolean;
  value?: StreamlangDSL;
  error?: Error;
}

export interface SuggestPipelineActions {
  suggestPipeline: (params: { connectorId: string; streamName: string }) => void;
  clearSuggestedSteps: () => void;
  cancelSuggestion: () => void;
  setShowSuggestion: (show: boolean) => void;
}

/**
 * Hook for pipeline suggestions using XState.
 * This is a thin wrapper around XState events and selectors.
 */
export function useSuggestPipeline() {
  const { service: enrichmentService } = useStreamEnrichmentEvents();

  // Only subscribe to the specific state slices we need
  const loading = useStreamEnrichmentSelector(
    (snapshot) => snapshot.children.suggestPipelineActor?.getSnapshot().status === 'active'
  );
  const suggestedPipeline = useStreamEnrichmentSelector(
    (snapshot) => snapshot.context.suggestedPipeline
  );
  const showSuggestion = useStreamEnrichmentSelector((snapshot) => snapshot.context.showSuggestion);

  const state: {
    state: SuggestPipelineState;
    showSuggestion: boolean;
  } = {
    state: {
      loading,
      value: suggestedPipeline,
      error: undefined, // XState doesn't expose errors in context yet
    },
    showSuggestion,
  };

  const suggestPipeline = useCallback(
    (params: { connectorId: string; streamName: string }) => {
      enrichmentService.send({ type: 'suggestion.generate', connectorId: params.connectorId });
    },
    [enrichmentService]
  );

  const clearSuggestedSteps = useCallback(() => {
    enrichmentService.send({ type: 'suggestion.dismiss' });
  }, [enrichmentService]);

  const cancelSuggestion = useCallback(() => {
    enrichmentService.send({ type: 'suggestion.cancel' });
  }, [enrichmentService]);

  const setShowSuggestion = useCallback(
    (show: boolean) => {
      if (show) {
        // Re-showing is not currently supported
      } else {
        enrichmentService.send({ type: 'suggestion.accept' });
      }
    },
    [enrichmentService]
  );

  return {
    ...state,
    suggestPipeline,
    clearSuggestedSteps,
    cancelSuggestion,
    setShowSuggestion,
  };
}
