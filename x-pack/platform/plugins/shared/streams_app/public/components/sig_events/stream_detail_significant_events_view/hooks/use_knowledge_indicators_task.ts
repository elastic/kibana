/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useOnboardingApi,
  type WorkflowExecutionResult,
} from '../../../../hooks/use_onboarding_api';
import { getFormattedError } from '../../../../util/errors';
import { useKibana } from '../../../../hooks/use_kibana';

type ExecutionStatus = WorkflowExecutionResult['status'];

interface Props {
  streamName: string;
  onComplete: (result: WorkflowExecutionResult) => void;
  onError: (result: WorkflowExecutionResult) => void;
}

export function useKnowledgeIndicatorsTask({ streamName, onComplete, onError }: Props) {
  const previousStatusRef = useRef<ExecutionStatus | null>(null);
  const [executionState, setExecutionState] = useState<WorkflowExecutionResult | null>(null);

  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const { getOnboardingExecution, runOnboarding, cancelOnboarding } = useOnboardingApi();

  const runMutation = useMutation({
    mutationFn: runOnboarding,
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), {
        title: KNOWLEDGE_INDICATORS_TASK_SCHEDULING_FAILURE_TITLE,
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelOnboarding,
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), {
        title: INSIGHTS_DISCOVERY_CANCELLATION_FAILURE_TITLE,
      });
    },
  });

  useEffect(() => {
    getOnboardingExecution(streamName)
      .then((result) => {
        setExecutionState(result);
        previousStatusRef.current = result.status;
      })
      .catch(() => {
        setExecutionState({ status: 'not_found' });
        previousStatusRef.current = 'not_found';
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleKnowledgeIndicatorsTask = useCallback(() => {
    setExecutionState({ status: 'pending' });
    runMutation.mutate(streamName);
  }, [runMutation, streamName]);

  const cancelKnowledgeIndicatorsTask = useCallback(() => {
    setExecutionState({ status: 'cancelled' });
    cancelMutation.mutate(streamName);
  }, [cancelMutation, streamName]);

  const isPending =
    executionState !== null && ['pending', 'running'].includes(executionState.status);

  const fetchStatus = async () => {
    const result = await getOnboardingExecution(streamName);

    setExecutionState(result);

    if (
      previousStatusRef.current !== null &&
      previousStatusRef.current !== 'completed' &&
      result.status === 'completed'
    ) {
      onComplete(result);
    }

    if (
      previousStatusRef.current !== null &&
      previousStatusRef.current !== 'failed' &&
      result.status === 'failed'
    ) {
      onError(result);
    }

    previousStatusRef.current = result.status;

    return result;
  };

  useQuery<WorkflowExecutionResult, Error>({
    queryKey: ['knowledgeIndicatorsTaskStatus', streamName],
    queryFn: fetchStatus,
    enabled: !runMutation.isLoading && !cancelMutation.isLoading,
    refetchInterval: 2000,
  });

  return {
    isPending,
    knowledgeIndicatorsTaskState: executionState,
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
