/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FeaturesIdentificationTaskResult } from '@kbn/streams-plugin/server/routes/internal/streams/features/route';
import type { AIFeatures } from '../../hooks/use_ai_features';
import { useTaskPolling } from '../../hooks/use_task_polling';
import { ConnectorListButton } from '../connector_list_button/connector_list_button';

interface FeatureIdentificationControlProps {
  refreshFeatures: () => void;
  aiFeatures: AIFeatures | null;
  getFeaturesIdentificationStatus: () => Promise<FeaturesIdentificationTaskResult>;
  scheduleFeaturesIdentificationTask: (connectorId: string) => Promise<void>;
  cancelFeaturesIdentificationTask: () => Promise<void>;
  disabled?: boolean;
  onTaskStart?: () => void;
  onTaskEnd?: () => void;
}

export function FeatureIdentificationControl({
  refreshFeatures,
  aiFeatures,
  getFeaturesIdentificationStatus,
  scheduleFeaturesIdentificationTask,
  cancelFeaturesIdentificationTask,
  disabled = false,
  onTaskStart,
  onTaskEnd,
}: FeatureIdentificationControlProps) {
  const [isLoading, setIsLoading] = useState(false);

  const [{ loading, value: task, error }, getTask] = useAsyncFn(getFeaturesIdentificationStatus);
  useEffect(() => {
    getTask();
  }, [getTask]);
  useTaskPolling(task, getFeaturesIdentificationStatus, getTask);

  // Sync task status with parent component
  useEffect(() => {
    if (task?.status === 'in_progress') {
      onTaskStart?.();
    } else if (task?.status === 'completed') {
      getTask();
      refreshFeatures();
      onTaskEnd?.();
    } else if (
      task?.status === 'being_canceled' ||
      task?.status === 'canceled' ||
      task?.status === 'failed' ||
      task?.status === 'stale' ||
      task?.status === 'acknowledged' ||
      task?.status === 'not_started'
    ) {
      onTaskEnd?.();
    }
  }, [task?.status, getTask, refreshFeatures, onTaskStart, onTaskEnd]);

  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate(
          'xpack.streams.streamDetailView.featureIdentificationLoadingTaskFailedLabel',
          { defaultMessage: 'Failed to load feature identification task status' }
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
          onTaskStart?.();
          scheduleFeaturesIdentificationTask(aiFeatures?.genAiConnectors.selectedConnector!).then(
            () => {
              setIsLoading(false);
              getTask();
            }
          );
        },
        'data-test-subj': 'feature_identification_identify_features_button',
        children: i18n.translate(
          'xpack.streams.streamDetailView.featureIdentificationButtonLabel',
          {
            defaultMessage: 'Identify features',
          }
        ),
      }}
    />
  );

  if (
    task.status === 'not_started' ||
    task.status === 'acknowledged' ||
    task.status === 'canceled' ||
    task.status === 'completed'
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
            data-test-subj="feature_identification_identify_features_button"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.featureIdentificationButtonInProgressLabel',
              {
                defaultMessage: 'Feature identification in progress',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="feature_identification_cancel_feature_identification_button"
            onClick={() => {
              cancelFeaturesIdentificationTask().then(() => {
                getTask();
                onTaskEnd?.();
              });
            }}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.cancelFeatureIdentificationButtonLabel',
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
          'data-test-subj': 'feature_identification_identify_features_button',
          children: i18n.translate(
            'xpack.streams.streamDetailView.featureIdentificationButtonCancellingLabel',
            {
              defaultMessage: 'Canceling feature identification task',
            }
          ),
        }}
      />
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
              'xpack.streams.streamDetailView.featureIdentificationTaskFailedLabel',
              { defaultMessage: 'Feature identification task failed' }
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
              'xpack.streams.streamDetailView.featureIdentificationTaskStaledLabel',
              { defaultMessage: 'Feature identification task did not complete' }
            )}
            color="warning"
            iconType="warning"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.featureIdentificationTaskStaledDescription',
              {
                defaultMessage:
                  "The feature identification task didn't report its status for a prolonged period and is considered stale. Please start a new task.",
              }
            )}
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return null;
}
