/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useCallback, useRef, useState } from 'react';
import {
  OnboardingStatus,
  ONBOARDING_IN_PROGRESS_STATUSES,
  type OnboardingStatusResult,
} from '@kbn/streams-schema';
import { useOnboardingApi } from '../../../../hooks/use_onboarding_api';
import { getFormattedError } from '../../../../util/errors';
import { useKibana } from '../../../../hooks/use_kibana';

interface Props {
  streamName: string;
  onComplete: (
    completedState: Extract<OnboardingStatusResult, { status: OnboardingStatus.Completed }>
  ) => void;
  onError: (
    failedState: Extract<OnboardingStatusResult, { status: OnboardingStatus.Failed }>
  ) => void;
}

export function useKnowledgeIndicatorsOnboarding({ streamName, onComplete, onError }: Props) {
  const previousStatusRef = useRef<OnboardingStatus | null>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingStatusResult | null>(null);

  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const { getOnboardingStatus, scheduleOnboarding, cancelOnboarding } = useOnboardingApi();

  const { mutate: scheduleMutate, isLoading: isScheduleLoading } = useMutation({
    mutationFn: scheduleOnboarding,
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), {
        title: SCHEDULING_FAILURE_TITLE,
      });
    },
  });

  const { mutate: cancelMutate, isLoading: isCancelLoading } = useMutation({
    mutationFn: cancelOnboarding,
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), {
        title: CANCELLATION_FAILURE_TITLE,
      });
    },
  });

  const isPending =
    onboardingState !== null && ONBOARDING_IN_PROGRESS_STATUSES.has(onboardingState.status);

  const fetchStatus = useCallback(async () => {
    const state = await getOnboardingStatus(streamName);

    // Preserve the optimistic BeingCanceled state while the engine
    // still reports InProgress — the cancel request was sent but the
    // engine hasn't acted on it yet.
    // NOTE: this is client-only state and will be lost on page refresh.
    // To fix, the workflow engine should expose `cancelRequested` in
    // WorkflowExecutionDto so the server can return BeingCanceled.
    const shouldPreserveBeingCanceled =
      previousStatusRef.current === OnboardingStatus.BeingCanceled &&
      state.status === OnboardingStatus.InProgress;

    if (shouldPreserveBeingCanceled) {
      return state;
    }

    setOnboardingState(state);

    /**
     * Firing an explicit callback when onboarding **changes** to
     * Completed state, so components can react by reloading
     * related data. This handles the case when there was
     * a successful run in the past and the state
     * reports Completed status, callback won't be fired in that
     * case.
     */
    if (
      previousStatusRef.current !== null &&
      previousStatusRef.current !== OnboardingStatus.Completed &&
      state.status === OnboardingStatus.Completed
    ) {
      onComplete(state);
    }

    if (
      previousStatusRef.current !== null &&
      previousStatusRef.current !== OnboardingStatus.Failed &&
      state.status === OnboardingStatus.Failed
    ) {
      onError(state);
    }

    previousStatusRef.current = state.status;

    return state;
  }, [getOnboardingStatus, streamName, onComplete, onError]);

  useQuery<OnboardingStatusResult, Error>({
    queryKey: ['knowledgeIndicatorsOnboardingStatus', streamName],
    queryFn: fetchStatus,
    enabled: !isScheduleLoading && !isCancelLoading,
    refetchInterval: isPending ? 2000 : false,
  });

  const scheduleKnowledgeIndicatorsOnboarding = useCallback(() => {
    setOnboardingState({ status: OnboardingStatus.InProgress });
    scheduleMutate(streamName);
  }, [scheduleMutate, streamName]);

  const cancelKnowledgeIndicatorsOnboarding = useCallback(() => {
    setOnboardingState({ status: OnboardingStatus.BeingCanceled });
    previousStatusRef.current = OnboardingStatus.BeingCanceled;
    cancelMutate(streamName);
  }, [cancelMutate, streamName]);

  return {
    isPending,
    onboardingState,
    scheduleKnowledgeIndicatorsOnboarding,
    cancelKnowledgeIndicatorsOnboarding,
  };
}

const SCHEDULING_FAILURE_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTaskSchedulingFailureTitle',
  {
    defaultMessage: 'Failed to schedule KIs generation',
  }
);

const CANCELLATION_FAILURE_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTaskCancellationFailureTitle',
  {
    defaultMessage: 'Failed to cancel KIs generation',
  }
);
