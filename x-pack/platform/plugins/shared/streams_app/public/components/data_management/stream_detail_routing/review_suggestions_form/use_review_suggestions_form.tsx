/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import type { Condition } from '@kbn/streamlang';
import constate from 'constate';
import { useState } from 'react';
import { useFetchSuggestedPartitions } from './use_fetch_suggested_partitions';
import { useStreamsRoutingActorRef } from '../state_management/stream_routing_state_machine';

const [ReviewSuggestionsFormProvider, useReviewSuggestionsFormContext] = constate(
  (props: { form: ReturnType<typeof useReviewSuggestionsForm> }) => props.form
);

export { ReviewSuggestionsFormProvider, useReviewSuggestionsFormContext };

export interface PartitionSuggestion {
  name: string;
  condition: Condition;
  selected?: boolean;
}

export function useReviewSuggestionsForm() {
  const streamsRoutingActorRef = useStreamsRoutingActorRef();
  const [suggestedPartitionsState, fetchSuggestions] = useFetchSuggestedPartitions();

  const [suggestions, setSuggestions] = useState<PartitionSuggestion[]>([]);

  const removeSuggestion = (index: number) => {
    setSuggestions((prevSuggestions) => prevSuggestions.toSpliced(index, 1));
  };

  const resetForm = () => {
    fetchSuggestions(null);
    streamsRoutingActorRef.send({
      type: 'suggestion.preview',
      condition: { always: {} },
      name: '',
      index: 0,
      toggle: false,
    });
  };
  const isEmpty = suggestedPartitionsState.value && suggestions.length === 0;

  // Update form values when suggestions are fetched or reset
  useUpdateEffect(() => {
    if (suggestedPartitionsState.value) {
      setSuggestions(suggestedPartitionsState.value.partitions);
    } else {
      setSuggestions([]);
    }
  }, [suggestedPartitionsState.value]);

  // Reset form when all partitions are removed
  useUpdateEffect(() => {
    if (suggestions.length === 0) {
      resetForm();
    }
  }, [suggestions.length]);

  return {
    suggestions,
    removeSuggestion,
    isEmpty,
    isLoadingSuggestions: suggestedPartitionsState.loading,
    fetchSuggestions,
    resetForm,
    previewSuggestion: (index: number, toggle?: boolean) => {
      const partition = suggestions[index];
      streamsRoutingActorRef.send({
        type: 'suggestion.preview',
        condition: partition.condition,
        name: partition.name,
        index,
        toggle,
      });
    },
    acceptSuggestion: (index: number) => {
      removeSuggestion(index);
    },
    rejectSuggestion: (index: number) => {
      const partition = suggestions[index];
      streamsRoutingActorRef.send({
        type: 'suggestion.preview',
        condition: partition.condition,
        name: partition.name,
        index,
        toggle: false,
      });
      removeSuggestion(index);
    },
  };
}
