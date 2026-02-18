/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { useState } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import { isRequestAbortedError } from '@kbn/server-route-repository-client';
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
      if (!isRequestAbortedError(error)) {
        showFetchErrorToast(error);
      }
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const removeSuggestion = (index: number) => {
    if (!suggestions) return;

    const updatedSuggestions = suggestions.toSpliced(index, 1);

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
  };
}
