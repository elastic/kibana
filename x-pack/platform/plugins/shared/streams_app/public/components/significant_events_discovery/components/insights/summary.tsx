/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TaskStatus } from '@kbn/streams-schema';
import React, { useEffect, useRef, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { Insight } from '@kbn/streams-schema';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { useInsightsDiscoveryApi } from '../../../../hooks/use_insights_discovery_api';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTaskPolling } from '../../../../hooks/use_task_polling';
import { getFormattedError } from '../../../../util/errors';
import { ConnectorListButton } from '../../../connector_list_button/connector_list_button';
import { FeedbackButtons } from './feedback_buttons';
import { InsightCard } from './insight_card';

export function Summary({ count }: { count: number }) {
  const aiFeatures = useAIFeatures();
  const {
    core: { notifications },
  } = useKibana();

  const {
    scheduleInsightsDiscoveryTask,
    getInsightsDiscoveryTaskStatus,
    acknowledgeInsightsDiscoveryTask,
    cancelInsightsDiscoveryTask,
  } = useInsightsDiscoveryApi(aiFeatures?.genAiConnectors.selectedConnector);

  const [{ value: task }, getTaskStatus] = useAsyncFn(getInsightsDiscoveryTaskStatus);
  const [{ loading: isSchedulingTask }, scheduleTask] = useAsyncFn(async () => {
    /**
     * Combining scheduling and immediate status update to prevent
     * React updating the UI in between states causing flickering
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

  useTaskPolling(task, getInsightsDiscoveryTaskStatus, getTaskStatus);

  const [insights, setInsights] = useState<Insight[] | null>(null);

  const onGenerateInsightsClick = async () => {
    await scheduleTask();
  };

  const onRegenerateInsightsClick = async () => {
    await acknowledgeInsightsDiscoveryTask();
    await scheduleTask();

    setInsights(null);
  };

  const onCancelClick = async () => {
    await cancelInsightsDiscoveryTask();
    getTaskStatus();
  };

  const isGenerateButtonPending =
    task?.status === TaskStatus.InProgress ||
    task?.status === TaskStatus.BeingCanceled ||
    isSchedulingTask;

  if (insights && insights.length > 0) {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="none">
            <EuiPanel color="subdued" hasShadow={false}>
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <FeedbackButtons />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill={true}
                    iconType="refresh"
                    onClick={onRegenerateInsightsClick}
                    disabled={isSchedulingTask}
                    isLoading={isSchedulingTask}
                    data-test-subj="significant_events_regenerate_insights_button"
                  >
                    {i18n.translate('xpack.streams.insights.regenerateButtonLabel', {
                      defaultMessage: 'Re-generate insights',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiPanel hasShadow={false}>
              <EuiFlexGroup direction="column" gutterSize="m">
                {insights.map((insight, idx) => (
                  <EuiFlexItem key={idx}>
                    <InsightCard insight={insight} index={idx} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPanel>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiPanel color="subdued">
          <EuiFlexGroup
            direction="column"
            alignItems="center"
            justifyContent="center"
            style={{ minHeight: '30vh', minWidth: '40vh' }}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="createAdvancedJob" size="xxl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate(
                    'xpack.streams.sigEventsDiscovery.insightsTab.significantEventsFoundTitle',
                    {
                      defaultMessage:
                        '{count} significant {count, plural, one {event} other {events}} detected',
                      values: {
                        count,
                      },
                    }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" textAlign="center" css={{ maxWidth: 400 }}>
                {i18n.translate(
                  'xpack.streams.sigEventsDiscovery.insightsTab.significantEventsFoundDescription',
                  {
                    defaultMessage:
                      'Start extracting insights from your logs, and understand what they mean with the power of AI and Elastic Observability.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <ConnectorListButton
                  buttonProps={{
                    fill: true,
                    size: 'm',
                    iconType: 'sparkles',
                    children:
                      task?.status === TaskStatus.InProgress
                        ? i18n.translate('xpack.streams.insights.generatingButtonLabel', {
                            defaultMessage: 'Generating insights',
                          })
                        : i18n.translate('xpack.streams.insights.generateButtonLabel', {
                            defaultMessage: 'Generate insights',
                          }),
                    onClick: onGenerateInsightsClick,
                    isDisabled: isGenerateButtonPending,
                    isLoading: isGenerateButtonPending,
                    'data-test-subj': 'significant_events_generate_insights_button',
                  }}
                />

                {(task?.status === TaskStatus.InProgress ||
                  task?.status === TaskStatus.BeingCanceled) && (
                  <EuiButton
                    onClick={onCancelClick}
                    isDisabled={task?.status === TaskStatus.BeingCanceled}
                    data-test-subj="significant_events_cancel_insights_generation_button"
                  >
                    {task?.status === TaskStatus.BeingCanceled
                      ? i18n.translate('xpack.streams.insights.cancellingTaskButtonLabel', {
                          defaultMessage: 'Cancelling',
                        })
                      : i18n.translate('xpack.streams.insights.cancelTaskButtonLabel', {
                          defaultMessage: 'Cancel',
                        })}
                  </EuiButton>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
