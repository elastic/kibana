/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import { i18n } from '@kbn/i18n';
import { TaskStatus, type Streams, type DashboardSuggestionResult } from '@kbn/streams-schema';
import type { AIFeatures } from '../../hooks/use_ai_features';
import { useDashboardSuggestionApi } from '../../hooks/use_dashboard_suggestion_api';
import { useTaskPolling } from '../../hooks/use_task_polling';
import { ConnectorListButtonBase } from '../connector_list_button/connector_list_button';
import { DashboardSuggestionPreview } from './dashboard_suggestion_preview';

interface DashboardSuggestionControlProps {
  definition: Streams.all.Definition;
  aiFeatures: AIFeatures | null;
}

export function DashboardSuggestionControl({
  definition,
  aiFeatures,
}: DashboardSuggestionControlProps) {
  const {
    getDashboardSuggestionStatus,
    scheduleDashboardSuggestionTask,
    cancelDashboardSuggestionTask,
  } = useDashboardSuggestionApi(definition);

  const [{ loading: isGettingTask, value: task, error }, getTask] = useAsyncFn(
    getDashboardSuggestionStatus
  );
  const previousStatusRef = useRef<TaskStatus | undefined>();
  const [guidance, setGuidance] = useState('');
  const [showPreview, { on: openPreview, off: closePreview }] = useBoolean(false);
  const [dashboardResult, setDashboardResult] = useState<DashboardSuggestionResult | undefined>();

  useEffect(() => {
    getTask();
  }, [getTask]);

  useTaskPolling(task, getDashboardSuggestionStatus, getTask);

  // Handle task completion
  useEffect(() => {
    const currentStatus = task?.status;
    const previousStatus = previousStatusRef.current;

    if (currentStatus === previousStatus) {
      return;
    }

    previousStatusRef.current = currentStatus;

    if (currentStatus === TaskStatus.Completed) {
      // Extract result from completed task
      if (task && 'dashboardSuggestion' in task) {
        setDashboardResult(task as DashboardSuggestionResult);
        openPreview();
      }
    }
  }, [task, openPreview]);

  const handleStartGeneration = useCallback(() => {
    const connectorId = aiFeatures?.genAiConnectors.selectedConnector;
    if (!connectorId) return;

    scheduleDashboardSuggestionTask(connectorId, guidance || undefined).then(getTask);
  }, [aiFeatures, guidance, scheduleDashboardSuggestionTask, getTask]);

  const handleCancelGeneration = useCallback(() => {
    cancelDashboardSuggestionTask().then(getTask);
  }, [cancelDashboardSuggestionTask, getTask]);

  const handleViewDashboard = useCallback(() => {
    if (task && task.status === TaskStatus.Completed && 'dashboardSuggestion' in task) {
      setDashboardResult(task as DashboardSuggestionResult);
      openPreview();
    }
  }, [task, openPreview]);

  if (error) {
    return <LoadingErrorCallout errorMessage={error.message} />;
  }

  if (task === undefined) {
    return null;
  }

  const isLoading = isGettingTask;

  return (
    <>
      {renderContent(
        task.status,
        isLoading,
        handleStartGeneration,
        handleCancelGeneration,
        handleViewDashboard,
        guidance,
        setGuidance,
        aiFeatures,
        task
      )}

      {showPreview && dashboardResult?.dashboardSuggestion && (
        <DashboardSuggestionPreview
          result={dashboardResult}
          onClose={closePreview}
          onRegenerate={handleStartGeneration}
        />
      )}
    </>
  );
}

function renderContent(
  status: TaskStatus,
  isLoading: boolean,
  onStart: () => void,
  onCancel: () => void,
  onView: () => void,
  guidance: string,
  setGuidance: (value: string) => void,
  aiFeatures: AIFeatures | null,
  task: unknown
) {
  switch (status) {
    case TaskStatus.NotStarted:
    case TaskStatus.Acknowledged:
    case TaskStatus.Canceled:
      return (
        <TriggerWithGuidance
          isLoading={isLoading}
          onClick={onStart}
          aiFeatures={aiFeatures}
          guidance={guidance}
          onGuidanceChange={setGuidance}
        />
      );

    case TaskStatus.Completed:
      return (
        <CompletedState
          isLoading={isLoading}
          onStartGeneration={onStart}
          onViewDashboard={onView}
          hasResult={Boolean(
            task &&
            typeof task === 'object' &&
            'dashboardSuggestion' in task &&
            (task as { dashboardSuggestion?: unknown }).dashboardSuggestion
          )}
          aiFeatures={aiFeatures}
          guidance={guidance}
          onGuidanceChange={setGuidance}
        />
      );

    case TaskStatus.InProgress:
      return <InProgressState onCancel={onCancel} />;

    case TaskStatus.BeingCanceled:
      return <CancellingState aiFeatures={aiFeatures} />;

    case TaskStatus.Failed:
      return (
        <StateWithCallout
          isLoading={isLoading}
          onStartGeneration={onStart}
          calloutTitle={TASK_FAILED_TITLE}
          calloutColor="danger"
          calloutIcon="error"
          aiFeatures={aiFeatures}
          guidance={guidance}
          onGuidanceChange={setGuidance}
        >
          {task && typeof task === 'object' && 'error' in task
            ? (task as { error?: string }).error
            : undefined}
        </StateWithCallout>
      );

    case TaskStatus.Stale:
      return (
        <StateWithCallout
          isLoading={isLoading}
          onStartGeneration={onStart}
          calloutTitle={TASK_STALE_TITLE}
          calloutColor="warning"
          calloutIcon="warning"
          aiFeatures={aiFeatures}
          guidance={guidance}
          onGuidanceChange={setGuidance}
        >
          {TASK_STALE_DESCRIPTION}
        </StateWithCallout>
      );

    default:
      return null;
  }
}

// Sub-components

const COMMON_BUTTON_PROPS = {
  size: 'm',
  iconType: 'sparkles',
  'data-test-subj': 'dashboard_suggestion_generate_button',
} as const;

interface TriggerWithGuidanceProps {
  isLoading: boolean;
  onClick: () => void;
  aiFeatures: AIFeatures | null;
  guidance: string;
  onGuidanceChange: (value: string) => void;
}

function TriggerWithGuidance({
  isLoading,
  onClick,
  aiFeatures,
  guidance,
  onGuidanceChange,
}: TriggerWithGuidanceProps) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFormRow
          label={GUIDANCE_LABEL}
          helpText={GUIDANCE_HELP_TEXT}
          fullWidth
        >
          <EuiFieldText
            placeholder={GUIDANCE_PLACEHOLDER}
            value={guidance}
            onChange={(e) => onGuidanceChange(e.target.value)}
            fullWidth
            data-test-subj="dashboard_suggestion_guidance_input"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConnectorListButtonBase
          aiFeatures={aiFeatures}
          buttonProps={{
            ...COMMON_BUTTON_PROPS,
            isLoading,
            onClick,
            children: GENERATE_BUTTON_LABEL,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

interface CompletedStateProps {
  isLoading: boolean;
  onStartGeneration: () => void;
  onViewDashboard: () => void;
  hasResult: boolean;
  aiFeatures: AIFeatures | null;
  guidance: string;
  onGuidanceChange: (value: string) => void;
}

function CompletedState({
  isLoading,
  onStartGeneration,
  onViewDashboard,
  hasResult,
  aiFeatures,
  guidance,
  onGuidanceChange,
}: CompletedStateProps) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {hasResult && (
        <EuiFlexItem>
          <EuiCallOut
            title={DASHBOARD_READY_TITLE}
            color="success"
            iconType="check"
          >
            <EuiSpacer size="s" />
            <EuiButton
              onClick={onViewDashboard}
              iconType="dashboardApp"
              data-test-subj="dashboard_suggestion_view_button"
            >
              {VIEW_DASHBOARD_BUTTON_LABEL}
            </EuiButton>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <TriggerWithGuidance
          isLoading={isLoading}
          onClick={onStartGeneration}
          aiFeatures={aiFeatures}
          guidance={guidance}
          onGuidanceChange={onGuidanceChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
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
          data-test-subj="dashboard_suggestion_generate_button"
        >
          {IN_PROGRESS_BUTTON_LABEL}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButtonEmpty
          data-test-subj="dashboard_suggestion_cancel_button"
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
  onStartGeneration: () => void;
  calloutTitle: string;
  calloutColor: 'danger' | 'warning' | 'primary';
  calloutIcon: 'error' | 'warning' | 'search';
  children: React.ReactNode;
  aiFeatures: AIFeatures | null;
  guidance: string;
  onGuidanceChange: (value: string) => void;
}

function StateWithCallout({
  isLoading,
  onStartGeneration,
  calloutTitle,
  calloutColor,
  calloutIcon,
  children,
  aiFeatures,
  guidance,
  onGuidanceChange,
}: StateWithCalloutProps) {
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <TriggerWithGuidance
          isLoading={isLoading}
          onClick={onStartGeneration}
          aiFeatures={aiFeatures}
          guidance={guidance}
          onGuidanceChange={onGuidanceChange}
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

const GENERATE_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionGenerateButtonLabel',
  { defaultMessage: 'Generate dashboard' }
);

const IN_PROGRESS_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionInProgressButtonLabel',
  { defaultMessage: 'Generating dashboard...' }
);

const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionCancelButtonLabel',
  { defaultMessage: 'Cancel' }
);

const CANCELLING_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionCancellingButtonLabel',
  { defaultMessage: 'Canceling dashboard generation...' }
);

const VIEW_DASHBOARD_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionViewButtonLabel',
  { defaultMessage: 'View dashboard' }
);

const LOADING_TASK_FAILED_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionLoadingTaskFailedLabel',
  { defaultMessage: 'Failed to load dashboard suggestion status' }
);

const TASK_FAILED_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionTaskFailedLabel',
  { defaultMessage: 'Dashboard generation failed' }
);

const TASK_STALE_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionTaskStaledLabel',
  { defaultMessage: 'Dashboard generation did not complete' }
);

const TASK_STALE_DESCRIPTION = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionTaskStaledDescription',
  {
    defaultMessage:
      "The dashboard generation task didn't report its status for a prolonged period and is considered stale. Please start a new task.",
  }
);

const DASHBOARD_READY_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionReadyTitle',
  { defaultMessage: 'Dashboard suggestion ready' }
);

const GUIDANCE_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionGuidanceLabel',
  { defaultMessage: 'Guidance (optional)' }
);

const GUIDANCE_HELP_TEXT = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionGuidanceHelpText',
  { defaultMessage: 'Provide hints to guide the dashboard generation (e.g., "Focus on error monitoring")' }
);

const GUIDANCE_PLACEHOLDER = i18n.translate(
  'xpack.streams.streamDetailView.dashboardSuggestionGuidancePlaceholder',
  { defaultMessage: 'e.g., Focus on performance metrics...' }
);
