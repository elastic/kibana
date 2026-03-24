/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { TaskStatus } from '@kbn/streams-schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { Insight, InsightImpactLevel } from '@kbn/streams-schema';
import { useInsightsDiscoveryApi } from '../../../../hooks/use_insights_discovery_api';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTaskPolling } from '../../../../hooks/use_task_polling';
import { getFormattedError } from '../../../../util/errors';
import { FeedbackButtons } from './feedback_buttons';
import { InsightFlyout } from './insight_flyout';

const impactBadgeColors: Record<InsightImpactLevel, 'danger' | 'warning' | 'primary' | 'hollow'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'hollow',
};

const impactLabels: Record<InsightImpactLevel, string> = {
  critical: i18n.translate('xpack.streams.insights.impact.critical', {
    defaultMessage: 'Critical',
  }),
  high: i18n.translate('xpack.streams.insights.impact.high', {
    defaultMessage: 'High',
  }),
  medium: i18n.translate('xpack.streams.insights.impact.medium', {
    defaultMessage: 'Medium',
  }),
  low: i18n.translate('xpack.streams.insights.impact.low', {
    defaultMessage: 'Low',
  }),
};

const formatGeneratedAt = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) {
    return i18n.translate('xpack.streams.insights.justNow', { defaultMessage: 'just now' });
  }
  if (diffMins < 60) {
    return i18n.translate('xpack.streams.insights.minutesAgo', {
      defaultMessage: '{count} {count, plural, one {minute} other {minutes}} ago',
      values: { count: diffMins },
    });
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return i18n.translate('xpack.streams.insights.hoursAgo', {
      defaultMessage: '{count} {count, plural, one {hour} other {hours}} ago',
      values: { count: diffHours },
    });
  }
  const diffDays = Math.floor(diffHours / 24);
  return i18n.translate('xpack.streams.insights.daysAgo', {
    defaultMessage: '{count} {count, plural, one {day} other {days}} ago',
    values: { count: diffDays },
  });
};

export function Summary({ count }: { count: number }) {
  const {
    core: { notifications },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const {
    scheduleInsightsDiscoveryTask,
    getInsightsDiscoveryTaskStatus,
    acknowledgeInsightsDiscoveryTask,
    cancelInsightsDiscoveryTask,
  } = useInsightsDiscoveryApi();

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

    if (task?.status === TaskStatus.InProgress && previousStatus !== TaskStatus.InProgress) {
      // A new task started (possibly triggered by the header "Run a discovery" button)
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

  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  const handleSelectInsight = useCallback((insight: Insight) => setSelectedInsight(insight), []);
  const handleCloseFlyout = useCallback(() => setSelectedInsight(null), []);

  const onGenerateInsightsClick = async () => {
    await scheduleTask();
  };

  const onRunDiscoveryClick = async () => {
    await acknowledgeInsightsDiscoveryTask();
    await scheduleTask();
    setInsights(null);
  };

  const isGenerateButtonPending =
    task?.status === TaskStatus.InProgress || isCancellingTask || isSchedulingTask;

  const columns = useMemo<Array<EuiBasicTableColumn<Insight>>>(
    () => [
      {
        field: 'id',
        name: '',
        width: '40px',
        render: (_: string, insight: Insight) => {
          const isSelected = selectedInsight?.id === insight.id;
          return (
            <EuiButtonIcon
              data-test-subj="streamsInsightExpandButton"
              iconType={isSelected ? 'minimize' : 'expand'}
              aria-label={
                isSelected
                  ? i18n.translate('xpack.streams.insights.table.minimizeAriaLabel', {
                      defaultMessage: 'Close insight details',
                    })
                  : i18n.translate('xpack.streams.insights.table.expandAriaLabel', {
                      defaultMessage: 'View insight details',
                    })
              }
              onClick={() => (isSelected ? handleCloseFlyout() : handleSelectInsight(insight))}
            />
          );
        },
      },
      {
        field: 'title',
        name: i18n.translate('xpack.streams.insights.table.titleColumn', {
          defaultMessage: 'Significant event',
        }),
        render: (title: string, insight: Insight) => (
          <div
            css={css`
              max-width: 100%;
              overflow: hidden;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiLink
                  onClick={() => handleSelectInsight(insight)}
                  data-test-subj="streamsInsightTitleLink"
                  css={css`
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: block;
                    max-width: 100%;
                  `}
                  title={title}
                >
                  {title}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText
                  size="xs"
                  color="subdued"
                  title={insight.description}
                  css={css`
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                    display: block;
                    width: 100%;
                  `}
                >
                  {insight.description}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ),
      },
      {
        field: 'impact',
        name: i18n.translate('xpack.streams.insights.table.severityColumn', {
          defaultMessage: 'Severity',
        }),
        width: '120px',
        render: (impact: InsightImpactLevel) => (
          <EuiBadge color={impactBadgeColors[impact]}>{impactLabels[impact]}</EuiBadge>
        ),
      },
      {
        field: 'generated_at',
        name: i18n.translate('xpack.streams.insights.table.generatedAtColumn', {
          defaultMessage: 'Discovered',
        }),
        width: '150px',
        render: (generatedAt: string) => (
          <EuiText size="s" color="subdued">
            {formatGeneratedAt(generatedAt)}
          </EuiText>
        ),
      },
    ],
    [handleSelectInsight, handleCloseFlyout, selectedInsight]
  );

  if (insights && insights.length > 0) {
    return (
      <>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              justifyContent="flexEnd"
              alignItems="center"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <FeedbackButtons />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="sparkles"
                  onClick={onRunDiscoveryClick}
                  disabled={isSchedulingTask}
                  isLoading={isSchedulingTask}
                  data-test-subj="significant_events_run_discovery_button"
                >
                  {i18n.translate('xpack.streams.insights.runDiscoveryButtonLabel', {
                    defaultMessage: 'Run a discovery',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBasicTable
              data-test-subj="streamsInsightsTable"
              columns={columns}
              items={insights}
              itemId="id"
              tableLayout="fixed"
              rowProps={(insight: Insight) => ({
                style: {
                  height: '68px',
                  background:
                    selectedInsight?.id === insight.id
                      ? euiTheme.colors.backgroundBaseInteractiveSelect
                      : undefined,
                },
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {selectedInsight && <InsightFlyout insight={selectedInsight} onClose={handleCloseFlyout} />}
      </>
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
              <EuiIcon type="createAdvancedJob" size="xxl" aria-hidden={true} />
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
                      'Discover Significant Events from your logs, and understand what they mean with the power of AI and Elastic Observability.',
                  }
                )}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup>
                <EuiButton
                  fill
                  size="m"
                  iconType="sparkles"
                  onClick={onGenerateInsightsClick}
                  isDisabled={isGenerateButtonPending}
                  isLoading={isGenerateButtonPending}
                  data-test-subj="significant_events_generate_insights_button"
                >
                  {task?.status === TaskStatus.InProgress
                    ? i18n.translate('xpack.streams.insights.generatingButtonLabel', {
                        defaultMessage: 'Discovering Significant Events',
                      })
                    : i18n.translate('xpack.streams.insights.generateButtonLabel', {
                        defaultMessage: 'Discover Significant Events',
                      })}
                </EuiButton>

                {(task?.status === TaskStatus.InProgress || isCancellingTask) && (
                  <EuiButton
                    onClick={cancelTask}
                    isDisabled={isCancellingTask}
                    data-test-subj="significant_events_cancel_insights_generation_button"
                  >
                    {isCancellingTask
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
