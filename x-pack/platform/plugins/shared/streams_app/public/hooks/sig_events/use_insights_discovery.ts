/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TaskStatus } from '@kbn/streams-schema';
import type { Insight } from '@kbn/streams-schema';
import { useEffect, useRef, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { getFormattedError } from '../../util/errors';
import { useKibana } from '../use_kibana';
import { useTaskPolling } from '../use_task_polling';
import { useInsightsDiscoveryApi } from './use_insights_discovery_api';

export function useInsightsDiscovery() {
  const {
    core: { notifications },
  } = useKibana();

  const {
    scheduleInsightsDiscoveryTask,
    getInsightsDiscoveryTaskStatus,
    acknowledgeInsightsDiscoveryTask,
    cancelInsightsDiscoveryTask,
  } = useInsightsDiscoveryApi();

  const [insights, setInsights] = useState<Insight[] | null>(null);

  const [{ value: task }, getTaskStatus] = useAsyncFn(getInsightsDiscoveryTaskStatus);
  const [{ loading: isSchedulingTask }, scheduleTask] = useAsyncFn(async () => {
    /**
     * Combining scheduling and immediate status update to prevent
     * React updating the UI in between states causing flickering.
     */
    await scheduleInsightsDiscoveryTask();
    await getTaskStatus();
  }, [scheduleInsightsDiscoveryTask, getTaskStatus]);

  useEffect(() => {
    getTaskStatus();
  }, [getTaskStatus]);

  const previousTaskStatusRef = useRef<TaskStatus | undefined>(undefined);

  useEffect(() => {
    const previousStatus = previousTaskStatusRef.current;
    previousTaskStatusRef.current = task?.status;

    if (task?.status === TaskStatus.InProgress && previousStatus !== TaskStatus.InProgress) {
      setInsights(null);
      return;
    }

    if (task?.status === TaskStatus.Failed) {
      notifications.toasts.addError(getFormattedError(new Error(task.error)), {
        title: i18n.translate('xpack.streams.insights.errorTitle', {
          defaultMessage: 'Error generating insights',
        }),
      });
      return;
    }

    if (task?.status === TaskStatus.Completed) {
      if (previousStatus === TaskStatus.InProgress && task.insights.length === 0) {
        notifications.toasts.addInfo({
          title: i18n.translate('xpack.streams.insights.noInsightsTitle', {
            defaultMessage: 'No insights found',
          }),
          text: i18n.translate('xpack.streams.insights.noInsightsDescription', {
            defaultMessage:
              'The AI could not generate any insights from the current significant events. Try again later when more events are available.',
          }),
        });
      }
      setInsights(task.insights);
    }
  }, [task, notifications.toasts]);

  const { cancelTask, isCancellingTask } = useTaskPolling({
    task,
    onPoll: getInsightsDiscoveryTaskStatus,
    onRefresh: getTaskStatus,
    onCancel: cancelInsightsDiscoveryTask,
  });

  const isTaskPending =
    task?.status === TaskStatus.InProgress || isCancellingTask || isSchedulingTask;

  const onRunDiscovery = async () => {
    await acknowledgeInsightsDiscoveryTask();
    await scheduleTask();
  };

  return {
    insights,
    task,
    isSchedulingTask,
    isTaskPending,
    onRunDiscovery,
    scheduleTask,
    cancelTask,
    isCancellingTask,
  };
}

export type InsightsDiscoveryState = ReturnType<typeof useInsightsDiscovery>;
