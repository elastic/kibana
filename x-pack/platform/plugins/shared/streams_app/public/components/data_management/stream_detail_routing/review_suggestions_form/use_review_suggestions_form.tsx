/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { useState } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import { lastValueFrom } from 'rxjs';
import { isEmpty } from 'lodash';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFetchErrorToast } from '../../../../hooks/use_fetch_error_toast';
import {
  useStreamsRoutingActorRef,
  useStreamsRoutingSelector,
} from '../state_management/stream_routing_state_machine';

export interface FetchSuggestedPartitionsParams {
  streamName: string;
  connectorId: string;
  start: number;
  end: number;
}

export interface PartitionSuggestion {
  name: string;
  condition: Condition;
}

export type UseReviewSuggestionsFormResult = ReturnType<typeof useReviewSuggestionsForm>;

export function useReviewSuggestionsForm() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();
  const streamName = useStreamsRoutingSelector(
    (snapshot) => snapshot.context.definition.stream.name
  );
  const streamsRoutingActorRef = useStreamsRoutingActorRef();

  const [suggestions, setSuggestions] = useState<PartitionSuggestion[] | undefined>(undefined);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestionIndexes, setSelectedSuggestionIndexes] = useState<Set<number>>(
    new Set()
  );

  const abortController = useAbortController();

  const fetchSuggestions = async (params: FetchSuggestedPartitionsParams) => {
    setIsLoadingSuggestions(true);
    try {
      const response = await lastValueFrom(
        streamsRepositoryClient.stream('POST /internal/streams/{name}/_suggest_partitions', {
          signal: abortController.signal,
          params: {
            path: { name: params.streamName },
            body: {
              connector_id: params.connectorId,
              start: params.start,
              end: params.end,
            },
          },
        })
      );
      setSuggestions(response.partitions);
    } catch (error) {
      if (error.name !== 'AbortError') {
        showFetchErrorToast(error);
      }
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const removeSuggestion = (index: number) => {
    if (!suggestions) return;

    const updatedSuggestions = suggestions.toSpliced(index, 1);

    // Update selected indexes after removal
    setSelectedSuggestionIndexes((prevSelected) => {
      const newSelected = new Set<number>();
      prevSelected.forEach((selectedIndex) => {
        if (selectedIndex < index) {
          newSelected.add(selectedIndex);
        } else if (selectedIndex > index) {
          // Shift down indexes that come after the removed item
          newSelected.add(selectedIndex - 1);
        }
        // Don't include the removed index
      });
      return newSelected;
    });

    // Reset form when all partitions are removed
    if (isEmpty(updatedSuggestions)) {
      resetForm();
    } else {
      setSuggestions(updatedSuggestions);
    }
  };

  const toggleSuggestionSelection = (index: number) => {
    setSelectedSuggestionIndexes((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return newSelected;
    });
  };

  const clearSuggestionSelection = () => {
    setSelectedSuggestionIndexes(new Set());
  };

  const selectAllSuggestions = () => {
    if (!suggestions) return;
    setSelectedSuggestionIndexes(new Set(suggestions.map((_, index) => index)));
  };

  // Bulk accept: removes multiple suggestions at once after successful fork operations
  // Indexes should be sorted in descending order to avoid shifting issues
  const bulkAcceptSuggestions = (indexes: number[]) => {
    if (!suggestions) return;

    // Sort indexes in descending order to remove from end first
    const sortedIndexes = [...indexes].sort((a, b) => b - a);

    let updatedSuggestions = [...suggestions];
    for (const index of sortedIndexes) {
      updatedSuggestions = updatedSuggestions.toSpliced(index, 1);
    }

    // Clear selection since all selected items are being removed
    setSelectedSuggestionIndexes(new Set());

    // Reset form when all partitions are removed
    if (isEmpty(updatedSuggestions)) {
      resetForm();
    } else {
      setSuggestions(updatedSuggestions);
    }
  };

  const updateSuggestion = (index: number, updates: Partial<PartitionSuggestion>) => {
    if (!suggestions) return;
    const updatedSuggestion = { ...suggestions[index], ...updates };
    const updatedSuggestions = suggestions.toSpliced(index, 1, updatedSuggestion);
    setSuggestions(updatedSuggestions);
  };

  const resetPreview = () => {
    streamsRoutingActorRef.send({
      type: 'suggestion.preview',
      condition: { always: {} },
      name: '',
      index: 0,
      toggle: false,
    });
  };

  const resetForm = () => {
    abortController.abort();
    abortController.refresh();
    setSuggestions(undefined);
    setSelectedSuggestionIndexes(new Set());
    resetPreview();
  };

  // Reset suggestions when navigating to a different stream
  useUpdateEffect(() => {
    resetForm();
  }, [streamName]);

  return {
    suggestions,
    removeSuggestion,
    isLoadingSuggestions,
    fetchSuggestions,
    resetForm,
    updateSuggestion,
    previewSuggestion: (index: number, toggle?: boolean) => {
      if (suggestions) {
        const partition = suggestions[index];
        streamsRoutingActorRef.send({
          type: 'suggestion.preview',
          condition: partition.condition,
          name: partition.name,
          index,
          toggle,
        });
      }
    },
    acceptSuggestion: removeSuggestion,
    rejectSuggestion: (index: number, isSelectedPreview: boolean = false) => {
      if (isSelectedPreview) {
        resetPreview();
      }
      removeSuggestion(index);
    },
    // Bulk selection state and functions
    selectedSuggestionIndexes,
    toggleSuggestionSelection,
    clearSuggestionSelection,
    selectAllSuggestions,
    isSuggestionSelected: (index: number) => selectedSuggestionIndexes.has(index),
    bulkAcceptSuggestions,
  };
}
