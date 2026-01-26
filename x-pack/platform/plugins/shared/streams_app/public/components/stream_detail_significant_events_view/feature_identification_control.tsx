/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
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
  isIdentifyingFeatures: boolean;
  onTaskStart: () => void;
  onTaskEnd: () => void;
}

export function FeatureIdentificationControl({
  refreshFeatures,
  aiFeatures,
  getFeaturesIdentificationStatus,
  scheduleFeaturesIdentificationTask,
  cancelFeaturesIdentificationTask,
  isIdentifyingFeatures,
  onTaskStart,
  onTaskEnd,
}: FeatureIdentificationControlProps) {
  const [{ loading: isGettingTask, value: task, error }, getTask] = useAsyncFn(
    getFeaturesIdentificationStatus
  );
  const previousStatusRef = useRef<string | undefined>();

  useEffect(() => {
    getTask();
  }, [getTask]);

  useTaskPolling(task, getFeaturesIdentificationStatus, getTask);

  // Sync task status with parent component - only trigger on status changes
  useEffect(() => {
    const currentStatus = task?.status;
    const previousStatus = previousStatusRef.current;

    // Skip if status hasn't changed
    if (currentStatus === previousStatus) {
      return;
    }

    previousStatusRef.current = currentStatus;

    if (currentStatus === 'in_progress') {
      onTaskStart();
    } else if (currentStatus === 'completed') {
      refreshFeatures();
      onTaskEnd();
    } else if (
      currentStatus === 'being_canceled' ||
      currentStatus === 'canceled' ||
      currentStatus === 'failed' ||
      currentStatus === 'stale' ||
      currentStatus === 'acknowledged' ||
      currentStatus === 'not_started'
    ) {
      onTaskEnd();
    }
  }, [task?.status, refreshFeatures, onTaskStart, onTaskEnd]);

  if (error) {
    return <LoadingErrorCallout errorMessage={error.message} />;
  }

  if (task === undefined) {
    return null;
  }

  const handleStartIdentification = () => {
    onTaskStart();
    scheduleFeaturesIdentificationTask(aiFeatures?.genAiConnectors.selectedConnector!).then(() => {
      getTask();
    });
  };

  const handleCancelIdentification = () => {
    cancelFeaturesIdentificationTask().then(() => {
      getTask();
      onTaskEnd();
    });
  };

  switch (task.status) {
    case 'not_started':
    case 'acknowledged':
    case 'canceled':
      return (
        <TriggerButton
          isLoading={isIdentifyingFeatures || isGettingTask}
          onClick={handleStartIdentification}
        />
      );

    case 'completed':
      return (
        <CompletedState
          featuresCount={task.features.length}
          isLoading={isIdentifyingFeatures || isGettingTask}
          onStartIdentification={handleStartIdentification}
          onDismiss={getTask}
        />
      );

    case 'in_progress':
      return <InProgressState onCancel={handleCancelIdentification} />;

    case 'being_canceled':
      return <CancellingState />;

    case 'failed':
      return (
        <StateWithCallout
          isLoading={isIdentifyingFeatures || isGettingTask}
          onStartIdentification={handleStartIdentification}
          calloutTitle={TASK_FAILED_TITLE}
          calloutColor="danger"
          calloutIcon="error"
        >
          {task.error}
        </StateWithCallout>
      );

    case 'stale':
      return (
        <StateWithCallout
          isLoading={isIdentifyingFeatures || isGettingTask}
          onStartIdentification={handleStartIdentification}
          calloutTitle={TASK_STALE_TITLE}
          calloutColor="warning"
          calloutIcon="warning"
        >
          {TASK_STALE_DESCRIPTION}
        </StateWithCallout>
      );

    default:
      return null;
  }
}

// Sub-components

interface TriggerButtonProps {
  isLoading: boolean;
  onClick: () => void;
}

function TriggerButton({ isLoading, onClick }: TriggerButtonProps) {
  return (
    <ConnectorListButton
      buttonProps={{
        size: 'm',
        iconType: 'sparkles',
        isLoading,
        onClick,
        'data-test-subj': 'feature_identification_identify_features_button',
        children: IDENTIFY_FEATURES_BUTTON_LABEL,
      }}
    />
  );
}

interface CompletedStateProps {
  featuresCount: number;
  isLoading: boolean;
  onStartIdentification: () => void;
  onDismiss: () => void;
}

function CompletedState({
  featuresCount,
  isLoading,
  onStartIdentification,
  onDismiss,
}: CompletedStateProps) {
  if (featuresCount === 0) {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <TriggerButton isLoading={isLoading} onClick={onStartIdentification} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title={NO_FEATURES_IDENTIFIED_TITLE}
            color="primary"
            iconType="search"
            onDismiss={onDismiss}
          >
            {NO_FEATURES_IDENTIFIED_DESCRIPTION}
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <TriggerButton isLoading={isLoading} onClick={onStartIdentification} />;
}

interface InProgressStateProps {
  onCancel: () => void;
}

function InProgressState({ onCancel }: InProgressStateProps) {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiButton
          iconType="sparkle"
          iconSide="right"
          isLoading={true}
          data-test-subj="feature_identification_identify_features_button"
        >
          {IN_PROGRESS_BUTTON_LABEL}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          data-test-subj="feature_identification_cancel_feature_identification_button"
          onClick={onCancel}
        >
          {CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function CancellingState() {
  return (
    <ConnectorListButton
      buttonProps={{
        size: 'm',
        iconType: 'sparkles',
        iconSide: 'right',
        isDisabled: true,
        isLoading: true,
        'data-test-subj': 'feature_identification_identify_features_button',
        children: CANCELLING_BUTTON_LABEL,
      }}
    />
  );
}

interface StateWithCalloutProps {
  isLoading: boolean;
  onStartIdentification: () => void;
  calloutTitle: string;
  calloutColor: 'danger' | 'warning' | 'primary';
  calloutIcon: 'error' | 'warning' | 'search';
  children: React.ReactNode;
}

function StateWithCallout({
  isLoading,
  onStartIdentification,
  calloutTitle,
  calloutColor,
  calloutIcon,
  children,
}: StateWithCalloutProps) {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <TriggerButton isLoading={isLoading} onClick={onStartIdentification} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCallOut
          announceOnMount
          title={calloutTitle}
          color={calloutColor}
          iconType={calloutIcon}
        >
          {children}
        </EuiCallOut>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface LoadingErrorCalloutProps {
  errorMessage: string;
}

function LoadingErrorCallout({ errorMessage }: LoadingErrorCalloutProps) {
  return (
    <EuiCallOut announceOnMount title={LOADING_TASK_FAILED_TITLE} color="danger" iconType="error">
      {errorMessage}
    </EuiCallOut>
  );
}

// i18n labels

const IDENTIFY_FEATURES_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.featureIdentificationButtonLabel',
  { defaultMessage: 'Identify features' }
);

const IN_PROGRESS_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.featureIdentificationButtonInProgressLabel',
  { defaultMessage: 'Feature identification in progress' }
);

const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.cancelFeatureIdentificationButtonLabel',
  { defaultMessage: 'Cancel' }
);

const CANCELLING_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.featureIdentificationButtonCancellingLabel',
  { defaultMessage: 'Canceling feature identification task' }
);

const LOADING_TASK_FAILED_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.featureIdentificationLoadingTaskFailedLabel',
  { defaultMessage: 'Failed to load feature identification task status' }
);

const TASK_FAILED_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.featureIdentificationTaskFailedLabel',
  { defaultMessage: 'Feature identification task failed' }
);

const TASK_STALE_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.featureIdentificationTaskStaledLabel',
  { defaultMessage: 'Feature identification task did not complete' }
);

const TASK_STALE_DESCRIPTION = i18n.translate(
  'xpack.streams.streamDetailView.featureIdentificationTaskStaledDescription',
  {
    defaultMessage:
      "The feature identification task didn't report its status for a prolonged period and is considered stale. Please start a new task.",
  }
);

const NO_FEATURES_IDENTIFIED_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.noFeaturesIdentifiedTitle',
  { defaultMessage: 'No features identified' }
);

const NO_FEATURES_IDENTIFIED_DESCRIPTION = i18n.translate(
  'xpack.streams.streamDetailView.noFeaturesIdentifiedDescription',
  {
    defaultMessage:
      "The feature identification task didn't find any new features in your data. You can try again with different AI connector settings or try later with new data ingested.",
  }
);
