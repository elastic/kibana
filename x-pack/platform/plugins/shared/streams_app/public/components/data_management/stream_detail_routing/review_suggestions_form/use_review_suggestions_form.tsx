/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import type { Condition } from '@kbn/streamlang';
import { useForm, useFieldArray } from 'react-hook-form';
import { useFetchSuggestedPartitions } from './use_fetch_suggested_partitions';

export { FormProvider } from 'react-hook-form';

export interface ReviewSuggestionsInputs {
  suggestions: Array<{
    name: string;
    condition: Condition;
    selected?: boolean;
  }>;
}

export function useReviewSuggestionsForm() {
  const [suggestedPartitionsState, fetchSuggestions] = useFetchSuggestedPartitions();
  const reviewSuggestionsForm = useForm<ReviewSuggestionsInputs>({
    defaultValues: { suggestions: [] },
  });
  const { fields: suggestions, remove: removeSuggestion } = useFieldArray({
    control: reviewSuggestionsForm.control,
    name: 'suggestions',
  });

  const resetForm = () => fetchSuggestions(null);
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
  };
}
