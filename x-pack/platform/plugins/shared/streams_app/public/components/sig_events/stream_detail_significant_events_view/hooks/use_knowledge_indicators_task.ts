/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TaskStatus, type OnboardingResult, type TaskResult } from '@kbn/streams-schema';
import { useOnboardingApi } from '../../../../hooks/use_onboarding_api';
import { getFormattedError } from '../../../../util/errors';
import { useKibana } from '../../../../hooks/use_kibana';

interface Props {
  streamName: string;
  onComplete: (
    completedTaskState: Extract<TaskResult<OnboardingResult>, { status: TaskStatus.Completed }>
  ) => void;
  onError: (
    failedTaskState: Extract<TaskResult<OnboardingResult>, { status: TaskStatus.Failed }>
  ) => void;
}

export function useKnowledgeIndicatorsTask({ streamName, onComplete, onError }: Props) {
  const previousTaskStatusRef = useRef<TaskStatus | null>(null);
  const [knowledgeIndicatorsTaskState, setKnowledgeIndicatorsTaskState] =
    useState<TaskResult<OnboardingResult> | null>(null);

  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const { getOnboardingTaskStatus, scheduleOnboardingTask, cancelOnboardingTask } =
    useOnboardingApi({ saveQueries: true });

  const scheduleTaskMutation = useMutation({
    mutationFn: scheduleOnboardingTask,
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), {
        title: KNOWLEDGE_INDICATORS_TASK_SCHEDULING_FAILURE_TITLE,
      });
    },
  });

  const cancelTaskMutation = useMutation({
    mutationFn: cancelOnboardingTask,
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), {
        title: INSIGHTS_DISCOVERY_CANCELLATION_FAILURE_TITLE,
      });
    },
  });

  useEffect(() => {
    getOnboardingTaskStatus(streamName)
      .then((taskState) => {
        setKnowledgeIndicatorsTaskState(taskState);
        previousTaskStatusRef.current = taskState.status;
      })
      .catch(() => {
        setKnowledgeIndicatorsTaskState({ status: TaskStatus.NotStarted });
        previousTaskStatusRef.current = TaskStatus.NotStarted;
      });
    /**
     * Explicitly running this hook only once to get the initial
     * task state
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleKnowledgeIndicatorsTask = useCallback(() => {
    setKnowledgeIndicatorsTaskState({
      status: TaskStatus.InProgress,
    });

    scheduleTaskMutation.mutate(streamName);
  }, [scheduleTaskMutation, streamName]);

  const cancelKnowledgeIndicatorsTask = useCallback(() => {
    setKnowledgeIndicatorsTaskState({
      status: TaskStatus.BeingCanceled,
    });

    cancelTaskMutation.mutate(streamName);
  }, [cancelTaskMutation, streamName]);

  const isPending =
    knowledgeIndicatorsTaskState !== null &&
    [TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(knowledgeIndicatorsTaskState.status);

  const fetchStatus = async () => {
    const taskState = await getOnboardingTaskStatus(streamName);

    setKnowledgeIndicatorsTaskState(taskState);

    /**
     * Firing an explicit callback when tasks **changes** to
     * Completed state, so components can react by reloading
     * task-related data. This handles the case when there was
     * a successful task ran in the past and the task state
     * reports Completed status, callback won't be fired in that
     * case.
     */
    if (
      previousTaskStatusRef.current !== null &&
      previousTaskStatusRef.current !== TaskStatus.Completed &&
      taskState.status === TaskStatus.Completed
    ) {
      onComplete(taskState);
    }

    if (
      previousTaskStatusRef.current !== null &&
      previousTaskStatusRef.current !== TaskStatus.Failed &&
      taskState.status === TaskStatus.Failed
    ) {
      onError(taskState);
    }

    previousTaskStatusRef.current = taskState.status;

    return taskState;
  };

  useQuery<TaskResult<OnboardingResult>, Error>({
    queryKey: ['knowledgeIndicatorsTaskStatus', streamName],
    queryFn: fetchStatus,
    enabled: isPending && !scheduleTaskMutation.isLoading && !cancelTaskMutation.isLoading,
    refetchInterval: 2000,
  });

  return {
    isPending,
    knowledgeIndicatorsTaskState,
    scheduleKnowledgeIndicatorsTask,
    cancelKnowledgeIndicatorsTask,
  };
}

const KNOWLEDGE_INDICATORS_TASK_SCHEDULING_FAILURE_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTaskSchedulingFailureTitle',
  {
    defaultMessage: 'Failed to schedule KIs generation',
  }
);

const INSIGHTS_DISCOVERY_CANCELLATION_FAILURE_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTaskCancellationFailureTitle',
  {
    defaultMessage: 'Failed to cancel KIs generation',
  }
);
