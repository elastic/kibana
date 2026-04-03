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
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { TaskStatus } from '@kbn/streams-schema';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { Insight, InsightImpactLevel } from '@kbn/streams-schema';
import { AssetImage } from '../../../../asset_image';
import { useInsightsDiscoveryApi } from '../../../../../hooks/sig_events/use_insights_discovery_api';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useTaskPolling } from '../../../../../hooks/use_task_polling';
import { getFormattedError } from '../../../../../util/errors';
import { impactBadgeColors, impactLabels } from './insight_constants';
import { InsightFlyout } from './insight_flyout';
import { formatGeneratedAt } from './utils';

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

  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

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
      setInsights(null);
      setSelectedInsight(null); // <-- add this
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

  const handleSelectInsight = useCallback((insight: Insight) => setSelectedInsight(insight), []);
  const handleCloseFlyout = useCallback(() => setSelectedInsight(null), []);

  const onRunDiscoveryClick = async () => {
    await acknowledgeInsightsDiscoveryTask();
    await scheduleTask();
  };

  const isTaskPending =
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
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            css={css`
              max-width: 100%;
              overflow: hidden;
            `}
          >
            <EuiFlexItem>
              <EuiLink
                onClick={() => handleSelectInsight(insight)}
                data-test-subj="streamsInsightTitleLink"
                title={title}
                css={css`
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  display: block;
                  max-width: 100%;
                `}
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
        width: '180px',
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
            <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="sparkles"
                  onClick={onRunDiscoveryClick}
                  isDisabled={isSchedulingTask}
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
    <EuiEmptyPrompt
      aria-live="polite"
      titleSize="xs"
      icon={<AssetImage type="significantEventsDiscovery" />}
      title={
        <h2>
          {i18n.translate(
            'xpack.streams.sigEventsDiscovery.insightsTab.significantEventsFoundTitle',
            {
              defaultMessage:
                '{count} {count, plural, one {event} other {events}} found in your system',
              values: { count },
            }
          )}
        </h2>
      }
      body={
        <p>
          {i18n.translate(
            'xpack.streams.sigEventsDiscovery.insightsTab.significantEventsFoundDescription',
            {
              defaultMessage:
                'Discover Significant Events from your logs, and understand what they mean with the power of AI and Elastic Observability.',
            }
          )}
        </p>
      }
      actions={
        <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="center">
          <EuiButton
            fill
            size="m"
            iconType="sparkles"
            onClick={() => scheduleTask()}
            isDisabled={isTaskPending}
            isLoading={isTaskPending}
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
      }
    />
  );
}
