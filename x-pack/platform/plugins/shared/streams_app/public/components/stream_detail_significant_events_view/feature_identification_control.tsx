/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import { i18n } from '@kbn/i18n';
import { TaskStatus, type Streams } from '@kbn/streams-schema';
import type { AIFeatures } from '../../hooks/use_ai_features';
import { useStreamFeaturesApi } from '../../hooks/use_stream_features_api';
import { useTaskPolling } from '../../hooks/use_task_polling';
import { ConnectorListButtonBase } from '../connector_list_button/connector_list_button';

interface FeatureIdentificationControlProps {
  definition: Streams.all.Definition;
  refreshFeatures: () => void;
  aiFeatures: AIFeatures | null;
  isIdentifyingFeatures: boolean;
  onTaskStart: () => void;
  onTaskEnd: () => void;
}

export function FeatureIdentificationControl({
  definition,
  refreshFeatures,
  aiFeatures,
  isIdentifyingFeatures,
  onTaskStart,
  onTaskEnd,
}: FeatureIdentificationControlProps) {
  const {
    getFeaturesIdentificationStatus,
    scheduleFeaturesIdentificationTask,
    cancelFeaturesIdentificationTask,
  } = useStreamFeaturesApi(definition);

  const [{ loading: isGettingTask, value: task, error }, getTask] = useAsyncFn(
    getFeaturesIdentificationStatus
  );
  const previousStatusRef = useRef<TaskStatus | undefined>();
  const [isNoResultsDismissed, { on: dismissNoResults, off: resetNoResultsDismissed }] =
    useBoolean(false);

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

    if (currentStatus === TaskStatus.InProgress) {
      resetNoResultsDismissed();
      onTaskStart();
    } else if (currentStatus === TaskStatus.Completed) {
      refreshFeatures();
      onTaskEnd();
    } else if (currentStatus !== undefined) {
      onTaskEnd();
    }
  }, [task?.status, refreshFeatures, onTaskStart, onTaskEnd, resetNoResultsDismissed]);

  const handleStartIdentification = useCallback(() => {
    const connectorId = aiFeatures?.genAiConnectors.selectedConnector;
    if (!connectorId) return;

    onTaskStart();
    scheduleFeaturesIdentificationTask(connectorId).then(getTask);
  }, [aiFeatures, onTaskStart, scheduleFeaturesIdentificationTask, getTask]);

  const handleCancelIdentification = useCallback(() => {
    cancelFeaturesIdentificationTask().then(() => {
      getTask();
      onTaskEnd();
    });
  }, [cancelFeaturesIdentificationTask, getTask, onTaskEnd]);

  if (error) {
    return <LoadingErrorCallout errorMessage={error.message} />;
  }

  if (task === undefined) {
    return null;
  }

  const isLoading = isIdentifyingFeatures || isGettingTask;

  switch (task.status) {
    case TaskStatus.NotStarted:
    case TaskStatus.Acknowledged:
    case TaskStatus.Canceled:
      return (
        <TriggerButton
          isLoading={isLoading}
          onClick={handleStartIdentification}
          aiFeatures={aiFeatures}
        />
      );

    case TaskStatus.Completed:
      return (
        <CompletedState
          isLoading={isLoading}
          onStartIdentification={handleStartIdentification}
          showNoResultsCallout={task.features.length === 0 && !isNoResultsDismissed}
          onDismissNoResults={dismissNoResults}
          aiFeatures={aiFeatures}
        />
      );

    case TaskStatus.InProgress:
      return <InProgressState onCancel={handleCancelIdentification} />;

    case TaskStatus.BeingCanceled:
      return <CancellingState aiFeatures={aiFeatures} />;

    case TaskStatus.Failed:
      return (
        <StateWithCallout
          isLoading={isLoading}
          onStartIdentification={handleStartIdentification}
          calloutTitle={TASK_FAILED_TITLE}
          calloutColor="danger"
          calloutIcon="error"
          aiFeatures={aiFeatures}
        >
          {task.error}
        </StateWithCallout>
      );

    case TaskStatus.Stale:
      return (
        <StateWithCallout
          isLoading={isLoading}
          onStartIdentification={handleStartIdentification}
          calloutTitle={TASK_STALE_TITLE}
          calloutColor="warning"
          calloutIcon="warning"
          aiFeatures={aiFeatures}
        >
          {TASK_STALE_DESCRIPTION}
        </StateWithCallout>
      );
  }

  assertNever(task);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled task status: ${JSON.stringify(value)}`);
}

// Sub-components

const COMMON_BUTTON_PROPS = {
  size: 'm',
  iconType: 'sparkles',
  'data-test-subj': 'feature_identification_identify_features_button',
} as const;

interface TriggerButtonProps {
  isLoading: boolean;
  onClick: () => void;
  aiFeatures: AIFeatures | null;
}

function TriggerButton({ isLoading, onClick, aiFeatures }: TriggerButtonProps) {
  return (
    <ConnectorListButtonBase
      aiFeatures={aiFeatures}
      buttonProps={{
        ...COMMON_BUTTON_PROPS,
        isLoading,
        onClick,
        children: IDENTIFY_FEATURES_BUTTON_LABEL,
      }}
    />
  );
}

interface CompletedStateProps {
  isLoading: boolean;
  onStartIdentification: () => void;
  showNoResultsCallout: boolean;
  onDismissNoResults: () => void;
  aiFeatures: AIFeatures | null;
}

function CompletedState({
  isLoading,
  onStartIdentification,
  showNoResultsCallout,
  onDismissNoResults,
  aiFeatures,
}: CompletedStateProps) {
  if (showNoResultsCallout) {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <TriggerButton
            isLoading={isLoading}
            onClick={onStartIdentification}
            aiFeatures={aiFeatures}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title={NO_FEATURES_IDENTIFIED_TITLE}
            color="primary"
            iconType="search"
            onDismiss={onDismissNoResults}
          >
            {NO_FEATURES_IDENTIFIED_DESCRIPTION}
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <TriggerButton isLoading={isLoading} onClick={onStartIdentification} aiFeatures={aiFeatures} />
  );
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
          iconSide="left"
          isLoading
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

interface CancellingStateProps {
  aiFeatures: AIFeatures | null;
}

function CancellingState({ aiFeatures }: CancellingStateProps) {
  return (
    <ConnectorListButtonBase
      aiFeatures={aiFeatures}
      buttonProps={{
        ...COMMON_BUTTON_PROPS,
        isDisabled: true,
        isLoading: true,
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
  aiFeatures: AIFeatures | null;
}

function StateWithCallout({
  isLoading,
  onStartIdentification,
  calloutTitle,
  calloutColor,
  calloutIcon,
  children,
  aiFeatures,
}: StateWithCalloutProps) {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <TriggerButton
          isLoading={isLoading}
          onClick={onStartIdentification}
          aiFeatures={aiFeatures}
        />
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
