/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Exploration Progress Component
 *
 * Real-time progress visualization for AESOP exploration workflows.
 * Shows:
 * - Phase-by-phase progress (1-5)
 * - Current step details
 * - Progress bar
 * - Estimated time remaining
 * - Phase duration metrics
 *
 * Polls every 2 seconds until completion.
 */

import React, { useEffect } from 'react';
import {
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiProgress,
  EuiSteps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { css } from '@emotion/react';
import { useEvalsApi } from '../../../hooks/use_evals_api';

interface WorkflowPhaseState {
  phase_number: number;
  phase_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration_ms?: number;
  started_at?: string;
  completed_at?: string;
}

interface WorkflowExecutionState {
  execution_id: string;
  workflow_name: string;
  status: 'running' | 'completed' | 'failed';
  current_phase: 1 | 2 | 3 | 4 | 5;
  current_step: string;
  total_steps: number;
  completed_steps: number;
  progress_percentage: number;
  estimated_time_remaining_ms: number;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  error_message?: string;
  phases: WorkflowPhaseState[];
}

interface ExplorationProgressProps {
  executionId: string;
  onComplete?: () => void;
}

export const ExplorationProgress: React.FC<ExplorationProgressProps> = ({
  executionId,
  onComplete,
}) => {
  const api = useEvalsApi();
  const { euiTheme } = useEuiTheme();

  const {
    data: progress,
    isLoading,
    error,
  } = useQuery<WorkflowExecutionState>({
    queryKey: ['aesop', 'exploration', 'progress', executionId],
    queryFn: async () => {
      const response = await api.http.get(`/internal/aesop/exploration/${executionId}/progress`, {
        version: '1',
      });
      return response as WorkflowExecutionState;
    },
    refetchInterval: (data) => {
      // Poll every 2 seconds if running, stop if completed/failed
      return data?.status === 'running' ? 2000 : false;
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Call onComplete when workflow finishes
  useEffect(() => {
    if (progress && progress.status !== 'running' && onComplete) {
      onComplete();
    }
  }, [progress, onComplete]);

  if (isLoading) {
    return (
      <EuiPanel>
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>Loading progress...</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (error) {
    return (
      <EuiCallOut title="Failed to load progress" color="danger" iconType="error">
        <p>{getErrorMessage(error)}</p>
      </EuiCallOut>
    );
  }

  if (!progress) {
    return null;
  }

  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Complete';
    const minutes = Math.ceil(ms / 60000);
    return `${minutes} minute${minutes === 1 ? '' : 's'} remaining`;
  };

  const getPhaseStatus = (phase: WorkflowPhaseState) => {
    switch (phase.status) {
      case 'completed':
        return {
          icon: 'check',
          color: euiTheme.colors.success,
          text: `Completed: ${phase.phase_name}`,
          suffix: phase.duration_ms ? `(${formatDuration(phase.duration_ms)})` : '',
        };
      case 'running':
        return {
          icon: 'clock',
          color: euiTheme.colors.primary,
          text: `In progress: ${phase.phase_name}`,
          suffix: '',
        };
      case 'failed':
        return {
          icon: 'cross',
          color: euiTheme.colors.danger,
          text: `Failed: ${phase.phase_name}`,
          suffix: '',
        };
      default:
        return {
          icon: 'dot',
          color: euiTheme.colors.lightShade,
          text: `Pending: ${phase.phase_name}`,
          suffix: '',
        };
    }
  };

  const steps = progress.phases.map((phase) => {
    const status = getPhaseStatus(phase);
    return {
      title: status.text,
      status:
        phase.status === 'completed'
          ? ('complete' as const)
          : phase.status === 'running'
          ? ('current' as const)
          : phase.status === 'failed'
          ? ('danger' as const)
          : ('incomplete' as const),
      children: status.suffix && (
        <EuiText size="s" color="subdued">
          {status.suffix}
        </EuiText>
      ),
    };
  });

  const progressColor =
    progress.status === 'completed'
      ? 'success'
      : progress.status === 'failed'
      ? 'danger'
      : 'primary';

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      css={css`
        background-color: ${euiTheme.colors.lightestShade};
      `}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText>
            <h3>
              {progress.status === 'running' && 'Exploration in Progress'}
              {progress.status === 'completed' && 'Exploration Complete'}
              {progress.status === 'failed' && 'Exploration Failed'}
            </h3>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={progressColor}>{progress.status.toUpperCase()}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Phase Steps */}
      <EuiSteps steps={steps} />

      <EuiSpacer size="m" />

      {/* Progress Bar */}
      <EuiProgress
        value={progress.progress_percentage}
        max={100}
        size="l"
        color={progressColor}
        label={`${progress.progress_percentage}% complete`}
        valueText
      />

      <EuiSpacer size="m" />

      {/* Current Step Details */}
      {progress.status === 'running' && (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>Current Step:</strong> {progress.current_step}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}

      {/* Statistics */}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            title={`${progress.completed_steps}/${progress.total_steps}`}
            description="Steps Completed"
            titleSize="s"
            textAlign="center"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={formatTimeRemaining(progress.estimated_time_remaining_ms)}
            description="Estimated Time"
            titleSize="s"
            textAlign="center"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={formatDuration(new Date().getTime() - new Date(progress.started_at).getTime())}
            description="Elapsed Time"
            titleSize="s"
            textAlign="center"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Error Message */}
      {progress.status === 'failed' && progress.error_message && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut title="Exploration Failed" color="danger" iconType="error">
            <p>{progress.error_message}</p>
          </EuiCallOut>
        </>
      )}

      {/* Success Message */}
      {progress.status === 'completed' && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut title="Exploration Complete" color="success" iconType="check">
            <p>
              Total duration:{' '}
              {formatDuration(
                new Date(progress.completed_at!).getTime() - new Date(progress.started_at).getTime()
              )}
            </p>
          </EuiCallOut>
        </>
      )}
    </EuiPanel>
  );
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
