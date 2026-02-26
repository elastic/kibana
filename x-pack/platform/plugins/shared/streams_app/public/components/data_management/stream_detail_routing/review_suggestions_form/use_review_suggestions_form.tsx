/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { TaskStatus } from '@kbn/streams-schema';
import { useCallback, useEffect, useRef, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { isEmpty } from 'lodash';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { usePartitionSuggestionApi } from '../../../../hooks/use_partition_suggestion_api';
import { useFetchErrorToast } from '../../../../hooks/use_fetch_error_toast';
import { useTaskPolling } from '../../../../hooks/use_task_polling';
import {
  useStreamsRoutingActorRef,
  useStreamsRoutingSelector,
} from '../state_management/stream_routing_state_machine';

export interface FetchSuggestedPartitionsParams {
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
  const showFetchErrorToast = useFetchErrorToast();
  const streamName = useStreamsRoutingSelector(
    (snapshot) => snapshot.context.definition.stream.name
  );
  const streamsRoutingActorRef = useStreamsRoutingActorRef();

  const {
    getPartitionSuggestionStatus,
    schedulePartitionSuggestionTask,
    cancelPartitionSuggestionTask,
  } = usePartitionSuggestionApi(streamName);

  const [suggestions, setSuggestions] = useState<PartitionSuggestion[] | undefined>(undefined);
  const previousStatusRef = useRef<TaskStatus | undefined>();

  const [{ loading: isGettingTask, value: task, error: taskError }, getTask] = useAsyncFn(
    getPartitionSuggestionStatus,
    [getPartitionSuggestionStatus]
  );

  useTaskPolling(task, getPartitionSuggestionStatus, getTask);

  useEffect(() => {
    const currentStatus = task?.status;
    const previousStatus = previousStatusRef.current;

    if (currentStatus === previousStatus) {
      return;
    }

    previousStatusRef.current = currentStatus;

    if (currentStatus === TaskStatus.Completed) {
      if (task && 'partitions' in task && Array.isArray(task.partitions)) {
        setSuggestions(task.partitions as PartitionSuggestion[]);
      }
    }

    if (currentStatus === TaskStatus.Failed) {
      if (task && 'error' in task) {
        showFetchErrorToast(new Error(task.error as string));
      }
    }
  }, [task, showFetchErrorToast]);

  useEffect(() => {
    if (taskError) {
      showFetchErrorToast(taskError);
    }
  }, [taskError, showFetchErrorToast]);

  const fetchSuggestions = useCallback(
    async (params: FetchSuggestedPartitionsParams) => {
      try {
        await schedulePartitionSuggestionTask({
          connectorId: params.connectorId,
          start: params.start,
          end: params.end,
        });
        await getTask();
      } catch (error) {
        if (error.name !== 'AbortError') {
          showFetchErrorToast(error);
        }
      }
    },
    [schedulePartitionSuggestionTask, getTask, showFetchErrorToast]
  );

  const cancelSuggestions = useCallback(async () => {
    try {
      await cancelPartitionSuggestionTask();
      await getTask();
    } catch (error) {
      if (!isRequestAbortedError(error)) {
        showFetchErrorToast(error);
      }
    }
  }, [cancelPartitionSuggestionTask, getTask, showFetchErrorToast]);

  const isLoadingSuggestions =
    isGettingTask ||
    task?.status === TaskStatus.InProgress ||
    task?.status === TaskStatus.BeingCanceled;

  const removeSuggestion = (index: number) => {
    if (!suggestions) return;

    const updatedSuggestions = suggestions.toSpliced(index, 1);

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

  const resetPreview = useCallback(() => {
    streamsRoutingActorRef.send({
      type: 'suggestion.preview',
      condition: { always: {} },
      name: '',
      index: 0,
      toggle: false,
    });
  }, [streamsRoutingActorRef]);

  const resetForm = useCallback(() => {
    setSuggestions(undefined);
    previousStatusRef.current = undefined;
    resetPreview();
  }, [resetPreview]);

  useUpdateEffect(() => {
    resetForm();
  }, [streamName]);

  return {
    suggestions,
    removeSuggestion,
    isLoadingSuggestions,
    fetchSuggestions,
    cancelSuggestions,
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
    task,
  };
}
