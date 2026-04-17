/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import { OnboardingStep } from '@kbn/streams-schema';
import pMap from 'p-map';
import { useCallback, useState } from 'react';
import type { ScheduleOnboardingOptions } from '../../../../hooks/use_onboarding_api';
import { useOnboardingApi } from '../../../../hooks/use_onboarding_api';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';
import { ONBOARDING_SCHEDULING_FAILURE_TITLE } from '../components/shared/translations';
import type { OnboardingConfig } from '../components/shared/types';
import { useOnboardingStatusUpdateQueue } from './use_onboarding_status_update_queue';

type StreamStatusUpdateCallback = (
  streamName: string,
  result: TaskResult<OnboardingResult>
) => void;

interface UseBulkOnboardingOptions {
  onboardingConfig: OnboardingConfig;
  onStreamStatusUpdate: StreamStatusUpdateCallback;
}

export function useBulkOnboarding({
  onboardingConfig,
  onStreamStatusUpdate,
}: UseBulkOnboardingOptions) {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();

  const { scheduleOnboardingTask, cancelOnboardingTask } = useOnboardingApi();
  const { onboardingStatusUpdateQueue, processStatusUpdateQueue } =
    useOnboardingStatusUpdateQueue(onStreamStatusUpdate);

  const [isScheduling, setIsScheduling] = useState(false);

  const bulkScheduleOnboardingTask = useCallback(
    async (streamNames: string[], options?: ScheduleOnboardingOptions): Promise<string[]> => {
      setIsScheduling(true);
      const succeeded: string[] = [];
      try {
        await pMap(
          streamNames,
          async (streamName) => {
            try {
              await scheduleOnboardingTask(streamName, options);
              succeeded.push(streamName);
            } catch (error) {
              toasts.addError(getFormattedError(error), {
                title: ONBOARDING_SCHEDULING_FAILURE_TITLE,
              });
            }
          },
          { concurrency: 10, stopOnError: false }
        );
      } finally {
        setIsScheduling(false);
      }

      succeeded.forEach((streamName) => {
        onboardingStatusUpdateQueue.add(streamName);
      });
      if (succeeded.length > 0) {
        processStatusUpdateQueue();
      }

      return succeeded;
    },
    [scheduleOnboardingTask, toasts, onboardingStatusUpdateQueue, processStatusUpdateQueue]
  );

  const bulkOnboardAll = useCallback(
    (streamNames: string[]) => bulkScheduleOnboardingTask(streamNames, onboardingConfig),
    [bulkScheduleOnboardingTask, onboardingConfig]
  );

  const bulkOnboardFeaturesOnly = useCallback(
    (streamNames: string[]) =>
      bulkScheduleOnboardingTask(streamNames, {
        steps: [OnboardingStep.FeaturesIdentification],
        connectors: onboardingConfig.connectors,
      }),
    [bulkScheduleOnboardingTask, onboardingConfig.connectors]
  );

  const bulkOnboardQueriesOnly = useCallback(
    (streamNames: string[]) =>
      bulkScheduleOnboardingTask(streamNames, {
        steps: [OnboardingStep.QueriesGeneration],
        connectors: onboardingConfig.connectors,
      }),
    [bulkScheduleOnboardingTask, onboardingConfig.connectors]
  );

  return {
    isScheduling,
    cancelOnboardingTask,
    bulkScheduleOnboardingTask,
    bulkOnboardAll,
    bulkOnboardFeaturesOnly,
    bulkOnboardQueriesOnly,
    onboardingStatusUpdateQueue,
    processStatusUpdateQueue,
  };
}
