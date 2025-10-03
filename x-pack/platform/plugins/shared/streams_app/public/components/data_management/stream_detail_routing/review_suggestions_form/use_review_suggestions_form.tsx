/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import type { Condition } from '@kbn/streamlang';
import { useForm, useFieldArray } from 'react-hook-form';
import constate from 'constate';
import { useFetchSuggestedPartitions } from './use_fetch_suggested_partitions';
import { useStreamsRoutingActorRef } from '../state_management/stream_routing_state_machine';
export { FormProvider } from 'react-hook-form';

const [ReviewSuggestionsFormProvider, useReviewSuggestionsFormContext] = constate(
  (props: { form: ReturnType<typeof useReviewSuggestionsForm> }) => props.form
);

export { ReviewSuggestionsFormProvider, useReviewSuggestionsFormContext };

export interface ReviewSuggestionsInputs {
  suggestions: Array<{
    name: string;
    condition: Condition;
    selected?: boolean;
  }>;
}

export function useReviewSuggestionsForm() {
  const streamsRoutingActorRef = useStreamsRoutingActorRef();
  const [suggestedPartitionsState, fetchSuggestions] = useFetchSuggestedPartitions();
  const reviewSuggestionsForm = useForm<ReviewSuggestionsInputs>({
    defaultValues: { suggestions: [] },
  });
  const { fields: suggestions, remove: removeSuggestion } = useFieldArray({
    control: reviewSuggestionsForm.control,
    name: 'suggestions',
  });

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
      reviewSuggestionsForm.setValue('suggestions', suggestedPartitionsState.value.partitions);
    } else {
      reviewSuggestionsForm.reset();
    }
  }, [suggestedPartitionsState.value]);

  // Reset form when all partitions are removed
  useUpdateEffect(() => {
    if (suggestions.length === 0) {
      resetForm();
    }
  }, [suggestions.length]);

  return {
    reviewSuggestionsForm,
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
