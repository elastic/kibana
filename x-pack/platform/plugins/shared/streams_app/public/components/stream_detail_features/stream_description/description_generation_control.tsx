/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useEffect, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import type { AIFeatures } from '../../../hooks/use_ai_features';
import { useTaskPolling } from '../../../hooks/use_task_polling';
import { ConnectorListButton } from '../../connector_list_button/connector_list_button';
import { useStreamDescriptionApi } from './use_stream_description_api';

interface DescriptionGenerationControlProps {
  onLoadDescription: (description: string) => void;
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
  aiFeatures: AIFeatures | null;
  disabled?: boolean;
}

export function DescriptionGenerationControl({
  onLoadDescription,
  definition,
  refreshDefinition,
  aiFeatures,
  disabled = false,
}: DescriptionGenerationControlProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    getDescriptionGenerationStatus,
    scheduleDescriptionGenerationTask,
    cancelDescriptionGenerationTask,
    acknowledgeDescriptionGenerationTask,
  } = useStreamDescriptionApi({ definition, refreshDefinition });

  const [{ loading, value: task, error }, getTask] = useAsyncFn(getDescriptionGenerationStatus);
  useEffect(() => {
    getTask();
  }, [getTask]);
  useTaskPolling(task, getDescriptionGenerationStatus, getTask);

  if (error) {
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
        {error.message}
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
        isLoading: isLoading || loading,
        isDisabled: disabled,
        onClick: () => {
          setIsLoading(true);
          scheduleDescriptionGenerationTask(aiFeatures?.genAiConnectors.selectedConnector!).then(
            () => {
              setIsLoading(false);
              getTask();
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
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton
            iconType="sparkle"
            iconSide="right"
            isLoading={true}
            data-test-subj="generate_description_button"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.descriptionGenerationInProgressLabel',
              {
                defaultMessage: 'Description generation in progress',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="cancel_description_generation_button"
            onClick={() => {
              cancelDescriptionGenerationTask().then(() => {
                getTask();
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
              defaultMessage: 'Canceling description generation task',
            }
          ),
        }}
      />
    );
  }

  if (task.status === 'completed') {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton
            onClick={() => {
              const description = task.description;
              acknowledgeDescriptionGenerationTask()
                .then(getTask)
                .then(() => {
                  onLoadDescription(description);
                });
            }}
            data-test-subj="load_generated_description_button"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.loadGeneratedDescriptionButtonLabel',
              {
                defaultMessage: 'Load generated description',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            onClick={() => {
              acknowledgeDescriptionGenerationTask().then(getTask);
            }}
            data-test-subj="discard_generated_description_button"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.discardGeneratedDescriptionButtonLabel',
              {
                defaultMessage: 'Discard generated description',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
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
