/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { DescriptionGenerationTaskResult } from '@kbn/streams-plugin/server/routes/internal/streams/description_generation/route';
import type { AIFeatures } from '../../../hooks/use_ai_features';
import { useTaskPolling } from '../../../hooks/use_task_polling';
import { ConnectorListButton } from '../../connector_list_button/connector_list_button';

interface DescriptionGenerationControlProps {
  isTaskLoading: boolean;
  task: DescriptionGenerationTaskResult | undefined;
  taskError: Error | undefined;
  refreshTask: () => Promise<DescriptionGenerationTaskResult>;
  getDescriptionGenerationStatus: () => Promise<DescriptionGenerationTaskResult>;
  scheduleDescriptionGenerationTask: (connectorId: string) => Promise<void>;
  cancelDescriptionGenerationTask: () => Promise<void>;
  aiFeatures: AIFeatures | null;
  disabled?: boolean;
}

export function DescriptionGenerationControl({
  isTaskLoading,
  task,
  taskError,
  refreshTask,
  getDescriptionGenerationStatus,
  scheduleDescriptionGenerationTask,
  cancelDescriptionGenerationTask,
  aiFeatures,
  disabled = false,
}: DescriptionGenerationControlProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    refreshTask();
  }, [refreshTask]);
  useTaskPolling(task, getDescriptionGenerationStatus, refreshTask);

  if (taskError) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate(
          'xpack.streams.streamDetailView.streamDescription.loadingTaskFailedLabel',
          { defaultMessage: 'Failed to load description generation task status' }
        )}
        color="danger"
        iconType="error"
      >
        {taskError.message}
      </EuiCallOut>
    );
  }

  if (task === undefined) {
    return null;
  }

  const triggerButton = (
    <ConnectorListButton
      buttonProps={{
        size: 'm',
        iconType: 'sparkles',
        isLoading: isLoading || isTaskLoading,
        isDisabled: disabled,
        onClick: () => {
          setIsLoading(true);
          scheduleDescriptionGenerationTask(aiFeatures?.genAiConnectors.selectedConnector!).then(
            () => {
              setIsLoading(false);
              refreshTask();
            }
          );
        },
        'data-test-subj': 'generate_description_button',
        children: i18n.translate(
          'xpack.streams.streamDetailView.streamDescription.descriptionGenerationButtonLabel',
          {
            defaultMessage: 'Generate description',
          }
        ),
      }}
    />
  );

  if (
    task.status === 'not_started' ||
    task.status === 'acknowledged' ||
    task.status === 'canceled'
  ) {
    return triggerButton;
  }

  if (task.status === 'in_progress') {
    return (
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="sparkle"
            iconSide="right"
            isLoading={true}
            data-test-subj="generate_description_button"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.descriptionGenerationInProgressLabel',
              {
                defaultMessage: 'Generating description',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="cancel_description_generation_button"
            onClick={() => {
              cancelDescriptionGenerationTask().then(() => {
                refreshTask();
              });
            }}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.cancelDescriptionGenerationButtonLabel',
              {
                defaultMessage: 'Cancel',
              }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (task.status === 'being_canceled') {
    return (
      <ConnectorListButton
        buttonProps={{
          size: 'm',
          iconType: 'sparkles',
          iconSide: 'right',
          isDisabled: true,
          isLoading: true,
          'data-test-subj': 'cancel_description_generation_button',
          children: i18n.translate(
            'xpack.streams.streamDetailView.streamDescription.descriptionGenerationCancellingLabel',
            {
              defaultMessage: 'Canceling generation',
            }
          ),
        }}
      />
    );
  }

  if (task.status === 'completed') {
    return triggerButton;
  }

  if (task.status === 'failed') {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>{triggerButton}</EuiFlexItem>
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.descriptionGenerationTaskFailedLabel',
              { defaultMessage: 'Description generation task failed' }
            )}
            color="danger"
            iconType="error"
          >
            {task.error}
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (task.status === 'stale') {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>{triggerButton}</EuiFlexItem>
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.descriptionGenerationTaskStaledLabel',
              { defaultMessage: 'Description generation task did not complete' }
            )}
            color="warning"
            iconType="warning"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.descriptionGenerationTaskStaledDescription',
              {
                defaultMessage:
                  "The description generation task didn't report its status for a prolonged period and is considered stale. Please start a new task.",
              }
            )}
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
