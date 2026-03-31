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
import { useStreamFeaturesApi } from '../../../hooks/sig_events/use_stream_features_api';
import { useTaskPolling } from '../../../hooks/use_task_polling';
import type { AIFeatures } from '../../../hooks/use_ai_features';
import { useConnectorIdSettings } from '../../../hooks/sig_events/use_connector_id_settings';
import { ConnectorNotConfiguredCallout } from '../connector_not_configured_callout';

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
  const { isKnowledgeIndicatorExtractionConnectorConfigured: isConnectorConfigured } =
    useConnectorIdSettings(aiFeatures?.genAiConnectors?.defaultConnector);
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

  const { cancelTask, isCancellingTask } = useTaskPolling({
    task,
    onPoll: getFeaturesIdentificationStatus,
    onRefresh: getTask,
    onCancel: cancelFeaturesIdentificationTask,
  });

  // Refresh features periodically while the task is running
  useEffect(() => {
    if (task?.status !== TaskStatus.InProgress) {
      return;
    }
    const interval = setInterval(refreshFeatures, 10_000);
    return () => clearInterval(interval);
  }, [task?.status, refreshFeatures]);

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
    onTaskStart();
    scheduleFeaturesIdentificationTask().then(getTask);
  }, [onTaskStart, scheduleFeaturesIdentificationTask, getTask]);

  const handleCancelIdentification = useCallback(() => {
    cancelTask().then(onTaskEnd);
  }, [cancelTask, onTaskEnd]);

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
          isConnectorConfigured={isConnectorConfigured}
        />
      );

    case TaskStatus.Completed:
      return (
        <CompletedState
          isLoading={isLoading}
          onStartIdentification={handleStartIdentification}
          showNoResultsCallout={task.features.length === 0 && !isNoResultsDismissed}
          onDismissNoResults={dismissNoResults}
          isConnectorConfigured={isConnectorConfigured}
        />
      );

    case TaskStatus.InProgress:
      return isCancellingTask ? (
        <CancellingState />
      ) : (
        <InProgressState onCancel={handleCancelIdentification} />
      );

    case TaskStatus.BeingCanceled:
      return <CancellingState />;

    case TaskStatus.Failed:
      return (
        <StateWithCallout
          isLoading={isLoading}
          onStartIdentification={handleStartIdentification}
          calloutTitle={TASK_FAILED_TITLE}
          calloutColor="danger"
          calloutIcon="error"
          isConnectorConfigured={isConnectorConfigured}
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
          isConnectorConfigured={isConnectorConfigured}
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
  isConnectorConfigured: boolean;
}

function TriggerButton({ isLoading, onClick, isConnectorConfigured }: TriggerButtonProps) {
  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false} style={{ alignSelf: 'flex-start' }}>
          <EuiButton
            {...COMMON_BUTTON_PROPS}
            isLoading={isLoading}
            onClick={onClick}
            isDisabled={!isConnectorConfigured}
          >
            {IDENTIFY_FEATURES_BUTTON_LABEL}
          </EuiButton>
        </EuiFlexItem>
        {!isConnectorConfigured && (
          <EuiFlexItem>
            <ConnectorNotConfiguredCallout />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
}

interface CompletedStateProps {
  isLoading: boolean;
  onStartIdentification: () => void;
  showNoResultsCallout: boolean;
  onDismissNoResults: () => void;
  isConnectorConfigured: boolean;
}

function CompletedState({
  isLoading,
  onStartIdentification,
  showNoResultsCallout,
  onDismissNoResults,
  isConnectorConfigured,
}: CompletedStateProps) {
  if (showNoResultsCallout) {
    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <TriggerButton
            isLoading={isLoading}
            onClick={onStartIdentification}
            isConnectorConfigured={isConnectorConfigured}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title={NO_FEATURES_IDENTIFIED_TITLE}
            color="primary"
            iconType="magnify"
            onDismiss={onDismissNoResults}
          >
            {NO_FEATURES_IDENTIFIED_DESCRIPTION}
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <TriggerButton
      isLoading={isLoading}
      onClick={onStartIdentification}
      isConnectorConfigured={isConnectorConfigured}
    />
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

function CancellingState() {
  return (
    <EuiButton {...COMMON_BUTTON_PROPS} isDisabled isLoading>
      {CANCELLING_BUTTON_LABEL}
    </EuiButton>
  );
}

interface StateWithCalloutProps {
  isLoading: boolean;
  onStartIdentification: () => void;
  calloutTitle: string;
  calloutColor: 'danger' | 'warning' | 'primary';
  calloutIcon: 'error' | 'warning' | 'search';
  children: React.ReactNode;
  isConnectorConfigured: boolean;
}

function StateWithCallout({
  isLoading,
  onStartIdentification,
  calloutTitle,
  calloutColor,
  calloutIcon,
  children,
  isConnectorConfigured,
}: StateWithCalloutProps) {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <TriggerButton
          isLoading={isLoading}
          onClick={onStartIdentification}
          isConnectorConfigured={isConnectorConfigured}
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
