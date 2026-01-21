/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiMarkdownFormat,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { TaskStatus } from '@kbn/streams-schema';
import { useTaskPolling } from '../../../../hooks/use_task_polling';
import { useInsightsApi } from '../../../../hooks/use_insights_api';
import { getFormattedError } from '../../../../util/errors';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { useKibana } from '../../../../hooks/use_kibana';
import { ConnectorListButton } from '../../../connector_list_button/connector_list_button';
import { FeedbackButtons } from './feedback_buttons';

export function Summary({ count }: { count: number }) {
  const aiFeatures = useAIFeatures();
  const {
    core: { notifications },
  } = useKibana();

  const {
    scheduleInsightsIdentificationTask,
    getInsightsIdentificationTaskStatus,
    acknowledgeInsightsIdentificationTask,
    cancelInsightsIdentificationTask,
  } = useInsightsApi();

  const [{ value: task }, getTaskStatus] = useAsyncFn(getInsightsIdentificationTaskStatus);
  const [{ loading: isSchedulingTask }, scheduleTask] = useAsyncFn(async (connectorId: string) => {
    /**
     * Combining scheduling and immediate status update to prevent
     * React updating the UI in between states causing flickering
     */
    await scheduleInsightsIdentificationTask(connectorId);
    await getTaskStatus();
  });

  useEffect(() => {
    getTaskStatus();
  }, [getTaskStatus]);

  useEffect(() => {
    if (task?.status === TaskStatus.Failed) {
      notifications.toasts.addError(getFormattedError(new Error(task.error)), {
        title: i18n.translate('xpack.streams.summary.insightsSummaryPanelErrorTitle', {
          defaultMessage: 'Error generating insights',
        }),
      });
      return;
    }

    if (task?.status === TaskStatus.Completed) {
      setSummary(task.summary);
    }
  }, [task, notifications.toasts]);

  useTaskPolling(task, getInsightsIdentificationTaskStatus, getTaskStatus);

  const [summary, setSummary] = useState<string | null>(null);

  const onGenerateSummaryClick = async () => {
    if (!aiFeatures?.genAiConnectors.selectedConnector) {
      return;
    }

    await scheduleTask(aiFeatures?.genAiConnectors.selectedConnector);
  };

  const onRegenerateSummaryClick = async () => {
    if (!aiFeatures?.genAiConnectors.selectedConnector) {
      return;
    }

    await acknowledgeInsightsIdentificationTask();
    await scheduleTask(aiFeatures?.genAiConnectors.selectedConnector);

    setSummary(null);
  };

  const onCancelClick = async () => {
    await cancelInsightsIdentificationTask();
    getTaskStatus();
  };

  const isGenerateButtonPending =
    task?.status === TaskStatus.InProgress ||
    task?.status === TaskStatus.BeingCanceled ||
    isSchedulingTask;

  if (summary) {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="none">
            <EuiPanel color="subdued" hasShadow={false}>
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h2>
                      {i18n.translate('xpack.streams.summary.insightsSummaryPanelLabel', {
                        defaultMessage: 'Insights summary',
                      })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <FeedbackButtons />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill={true}
                    iconType="refresh"
                    onClick={onRegenerateSummaryClick}
                    disabled={isSchedulingTask}
                    isLoading={isSchedulingTask}
                  >
                    {i18n.translate('xpack.streams.summary.regenerateInsightsButtonLabel', {
                      defaultMessage: 'Re-generate insights',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiPanel hasShadow={false}>
              <EuiMarkdownFormat>{summary}</EuiMarkdownFormat>
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
                        ? i18n.translate(
                            'xpack.streams.significantEventsSummary.generatingInsightsButtonLabel',
                            {
                              defaultMessage: 'Generating insights',
                            }
                          )
                        : i18n.translate(
                            'xpack.streams.significantEventsSummary.generateSummaryButtonLabel',
                            {
                              defaultMessage: 'Generate insights',
                            }
                          ),
                    onClick: onGenerateSummaryClick,
                    isDisabled: isGenerateButtonPending,
                    isLoading: isGenerateButtonPending,
                    'data-test-subj': 'significant_events_generate_summary_button',
                  }}
                />

                {(task?.status === TaskStatus.InProgress ||
                  task?.status === TaskStatus.BeingCanceled) && (
                  <EuiButton
                    onClick={onCancelClick}
                    isDisabled={task?.status === TaskStatus.BeingCanceled}
                  >
                    {task?.status === TaskStatus.BeingCanceled
                      ? i18n.translate('xpack.streams.summary.cancellingTaskButtonLabel', {
                          defaultMessage: 'Cancelling',
                        })
                      : i18n.translate('xpack.streams.summary.cancelTaskButtonLabel', {
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
