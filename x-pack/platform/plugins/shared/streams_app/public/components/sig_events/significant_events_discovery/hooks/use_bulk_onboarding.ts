/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { OnboardingStep } from '@kbn/streams-schema';
import pMap from 'p-map';
import { useCallback, useState } from 'react';
import type { WorkflowExecutionResult } from '../../../../hooks/use_onboarding_api';
import { useOnboardingApi, type RunOnboardingOptions } from '../../../../hooks/use_onboarding_api';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';
import type { OnboardingConfig } from '../components/shared/types';
import { useOnboardingStatusUpdateQueue } from './use_onboarding_status_update_queue';

type StreamStatusUpdateCallback = (streamName: string, result: WorkflowExecutionResult) => void;

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

  const { runOnboarding, cancelOnboarding } = useOnboardingApi();
  const { onboardingStatusUpdateQueue, processStatusUpdateQueue } =
    useOnboardingStatusUpdateQueue(onStreamStatusUpdate);

  const [isScheduling, setIsScheduling] = useState(false);

  const bulkScheduleOnboardingTask = useCallback(
    async (streamNames: string[], options?: RunOnboardingOptions): Promise<string[]> => {
      setIsScheduling(true);
      const succeeded: string[] = [];
      const failures: Array<{ streamName: string; error: unknown }> = [];
      try {
        await pMap(
          streamNames,
          async (streamName) => {
            try {
              await runOnboarding(streamName, options);
              succeeded.push(streamName);
            } catch (error) {
              failures.push({ streamName, error });
            }
          },
          { concurrency: 10, stopOnError: false }
        );
      } finally {
        setIsScheduling(false);
      }

      if (failures.length > 0) {
        toasts.addError(
          new Error(
            failures
              .map(({ streamName, error }) => `${streamName}: ${getFormattedError(error).message}`)
              .join('\n')
          ),
          {
            title: i18n.translate('xpack.streams.bulkOnboarding.schedulingErrorSummary', {
              defaultMessage:
                'Failed to schedule onboarding for {count, plural, one {# stream} other {# streams}}',
              values: { count: failures.length },
            }),
          }
        );
      }

      succeeded.forEach((streamName) => {
        onboardingStatusUpdateQueue.add(streamName);
      });
      if (succeeded.length > 0) {
        processStatusUpdateQueue();
      }

      return succeeded;
    },
    [runOnboarding, toasts, onboardingStatusUpdateQueue, processStatusUpdateQueue]
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
    cancelOnboarding,
    bulkScheduleOnboardingTask,
    bulkOnboardAll,
    bulkOnboardFeaturesOnly,
    bulkOnboardQueriesOnly,
    onboardingStatusUpdateQueue,
    processStatusUpdateQueue,
  };
}
