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
  EuiPopover,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TaskStatus } from '@kbn/streams-schema';
import React, { useCallback, useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useBoolean } from '@kbn/react-hooks';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { useStreamsSuggestionApi } from '../../hooks/use_streams_suggestion_api';
import { useTaskPolling } from '../../hooks/use_task_polling';
import { useTimeRange } from '../../hooks/use_time_range';
import { useKibana } from '../../hooks/use_kibana';
import { getFormattedError } from '../../util/errors';
import { ConnectorListButtonBase } from '../connector_list_button/connector_list_button';

interface StreamsSuggestionButtonProps {
  streamName: string;
  onSuggestionComplete?: () => void;
}

export function StreamsSuggestionButton({
  streamName,
  onSuggestionComplete,
}: StreamsSuggestionButtonProps) {
  const aiFeatures = useAIFeatures();
  const {
    core: { notifications },
  } = useKibana();
  const { startMs, endMs } = useTimeRange();

  const {
    scheduleSuggestionTask,
    getSuggestionTaskStatus,
    cancelSuggestionTask,
    acknowledgeSuggestionTask,
  } = useStreamsSuggestionApi(streamName);

  const [isStatusPopoverOpen, { off: closeStatusPopover, toggle: toggleStatusPopover }] =
    useBoolean(false);
  const statusPopoverId = useGeneratedHtmlId({ prefix: 'suggestionStatusPopover' });

  // Get task status
  const [{ value: task }, getTaskStatus] = useAsyncFn(getSuggestionTaskStatus, [
    getSuggestionTaskStatus,
  ]);

  // Schedule task
  const [{ loading: isSchedulingTask }, scheduleTask] = useAsyncFn(async () => {
    if (!aiFeatures?.genAiConnectors.selectedConnector) {
      return;
    }
    await scheduleSuggestionTask({
      connectorId: aiFeatures.genAiConnectors.selectedConnector,
      start: startMs,
      end: endMs,
    });
    await getTaskStatus();
  }, [scheduleSuggestionTask, getTaskStatus, aiFeatures, startMs, endMs]);

  // Cancel task
  const [{ loading: isCancellingTask }, cancelTask] = useAsyncFn(async () => {
    await cancelSuggestionTask();
    await getTaskStatus();
  }, [cancelSuggestionTask, getTaskStatus]);

  // Acknowledge completed task
  const acknowledgeTask = useCallback(async () => {
    await acknowledgeSuggestionTask();
    await getTaskStatus();
  }, [acknowledgeSuggestionTask, getTaskStatus]);

  // Initial status fetch
  useEffect(() => {
    getTaskStatus();
  }, [getTaskStatus]);

  // Handle task completion
  useEffect(() => {
    if (task?.status === TaskStatus.Completed) {
      const streamsCreated = task.streams?.filter((s) => s.status === 'created').length ?? 0;
      if (streamsCreated > 0) {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.streams.suggestion.successTitle', {
            defaultMessage: 'Stream suggestions created',
          }),
          text: i18n.translate('xpack.streams.suggestion.successDescription', {
            defaultMessage:
              '{count} suggested {count, plural, one {stream} other {streams}} created. Review and enable them to start routing data.',
            values: { count: streamsCreated },
          }),
        });
      } else {
        notifications.toasts.addInfo({
          title: i18n.translate('xpack.streams.suggestion.noSuggestionsTitle', {
            defaultMessage: 'No suggestions generated',
          }),
          text: i18n.translate('xpack.streams.suggestion.noSuggestionsDescription', {
            defaultMessage:
              'The AI could not generate any stream partition suggestions from the current data. Try again later when more data is available.',
          }),
        });
      }
      // Auto-acknowledge and refresh
      acknowledgeTask();
      onSuggestionComplete?.();
    } else if (task?.status === TaskStatus.Failed) {
      notifications.toasts.addError(getFormattedError(new Error(task.error)), {
        title: i18n.translate('xpack.streams.suggestion.errorTitle', {
          defaultMessage: 'Error generating stream suggestions',
        }),
      });
    }
  }, [task, notifications.toasts, acknowledgeTask, onSuggestionComplete]);

  // Poll for status updates
  useTaskPolling(task, getSuggestionTaskStatus, getTaskStatus);

  const isTaskRunning =
    task?.status === TaskStatus.InProgress || task?.status === TaskStatus.BeingCanceled;
  const isButtonPending = isTaskRunning || isSchedulingTask;

  const handleGenerateClick = async () => {
    await scheduleTask();
  };

  const handleCancelClick = async () => {
    await cancelTask();
  };

  // Don't render if AI features are not available
  if (!aiFeatures?.enabled) {
    return null;
  }

  // Show status popover if task is completed with results
  const showStatusDetails =
    task?.status === TaskStatus.Completed && task.streams && task.streams.length > 0;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <ConnectorListButtonBase
          buttonProps={{
            iconType: 'sparkles',
            size: 's',
            onClick: handleGenerateClick,
            isDisabled: isButtonPending,
            isLoading: isButtonPending,
            'data-test-subj': 'streamsSuggestionGenerateButton',
            children: isTaskRunning
              ? i18n.translate('xpack.streams.suggestion.generatingButtonLabel', {
                  defaultMessage: 'Generating suggestions...',
                })
              : i18n.translate('xpack.streams.suggestion.generateButtonLabel', {
                  defaultMessage: 'Generate stream suggestions',
                }),
          }}
          aiFeatures={aiFeatures}
        />
      </EuiFlexItem>
      {isTaskRunning && (
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={handleCancelClick}
            isDisabled={isCancellingTask || task?.status === TaskStatus.BeingCanceled}
            data-test-subj="streamsSuggestionCancelButton"
          >
            {task?.status === TaskStatus.BeingCanceled
              ? i18n.translate('xpack.streams.suggestion.cancellingButtonLabel', {
                  defaultMessage: 'Cancelling...',
                })
              : i18n.translate('xpack.streams.suggestion.cancelButtonLabel', {
                  defaultMessage: 'Cancel',
                })}
          </EuiButton>
        </EuiFlexItem>
      )}
      {showStatusDetails && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            id={statusPopoverId}
            isOpen={isStatusPopoverOpen}
            closePopover={closeStatusPopover}
            button={
              <EuiButton
                size="s"
                iconType="inspect"
                onClick={toggleStatusPopover}
                data-test-subj="streamsSuggestionStatusButton"
              >
                {i18n.translate('xpack.streams.suggestion.viewResultsButtonLabel', {
                  defaultMessage: 'View results',
                })}
              </EuiButton>
            }
          >
            <EuiText size="s" style={{ maxWidth: 300 }}>
              <p>
                {i18n.translate('xpack.streams.suggestion.resultsDescription', {
                  defaultMessage:
                    '{created} {created, plural, one {stream} other {streams}} created, {failed} failed',
                  values: {
                    created: task.streams?.filter((s) => s.status === 'created').length ?? 0,
                    failed: task.streams?.filter((s) => s.status === 'failed').length ?? 0,
                  },
                })}
              </p>
            </EuiText>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
