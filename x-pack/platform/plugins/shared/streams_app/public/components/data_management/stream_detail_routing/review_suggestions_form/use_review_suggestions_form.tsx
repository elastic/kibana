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
  partitions: Array<{
    name: string;
    condition: Condition;
    selected?: boolean;
  }>;
}

export function useReviewSuggestionsForm() {
  const [suggestedPartitionsState, fetchSuggestedPartitions] = useFetchSuggestedPartitions();
  const reviewSuggestionsForm = useForm<ReviewSuggestionsInputs>({
    defaultValues: { partitions: [] },
  });
  const { fields: partitions, remove: removePartition } = useFieldArray({
    control: reviewSuggestionsForm.control,
    name: 'partitions',
  });

  useUpdateEffect(() => {
    if (suggestedPartitionsState.value) {
      reviewSuggestionsForm.setValue('partitions', suggestedPartitionsState.value.partitions);
    } else {
      // reviewSuggestionsForm.reset();
    }
  }, [suggestedPartitionsState.value]);

  return {
    reviewSuggestionsForm,
    partitions,
    removePartition,
    isEmpty: suggestedPartitionsState.value && partitions.length === 0,
    isLoadingSuggestedPartitions: suggestedPartitionsState.loading,
    fetchSuggestedPartitions,
    reset: () => {
      reviewSuggestionsForm.reset();
      fetchSuggestedPartitions(null);
    },
  };
}
