/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  type EuiBadgeProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ExperimentExecutionStepStatus } from '../../../common/experiments/run_experiment';
import { useCancelWorkflowExecution } from '../../hooks/use_experiments_api';
import type { WorkflowExecutionView } from '../../hooks/use_experiments_api';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);
const EVALUATE_DATASET_STEP_TYPE = 'evals.evaluateDataset';

const isTerminal = (status: string) => TERMINAL_STATUSES.has(status);

const statusColor = (status: string): EuiBadgeProps['color'] => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
    case 'timed_out':
      return 'danger';
    case 'cancelled':
      return 'warning';
    case 'running':
      return 'primary';
    default:
      return 'hollow';
  }
};

const cancelLabel = i18n.translate('xpack.evals.runProgress.cancel', {
  defaultMessage: 'Cancel run',
});

const DatasetStepProgress: React.FC<{ step: ExperimentExecutionStepStatus }> = ({ step }) => {
  const progress = step.progress;
  const total = progress?.total;
  const done = (progress?.completed ?? 0) + (progress?.failed ?? 0);
  const errors = progress?.errors;

  const settled = isTerminal(step.status);
  const knownTotal = typeof total === 'number' && total > 0 ? total : undefined;
  const max = knownTotal ?? Math.max(done, 1);
  // Show the indeterminate (animated) bar only while the step is running and
  // nothing has finished yet — this conveys activity for long single-batch runs
  // instead of a bar frozen at 0. As soon as anything completes (or the step
  // settles) switch to a determinate bar so it never keeps spinning after
  // finishing.
  const value = settled ? max : done > 0 ? done : undefined;

  return (
    <div data-test-subj="evalsDatasetStepProgress">
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.evals.runProgress.datasetCounts', {
          defaultMessage: '{done} / {total} examples · {failed} failed · {scores} scores ingested',
          values: {
            done,
            total: total ?? '?',
            failed: progress?.failed ?? 0,
            scores: progress?.scores_ingested ?? 0,
          },
        })}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiProgress
        value={value}
        max={max}
        size="s"
        color={step.status === 'failed' ? 'danger' : 'primary'}
      />
      {errors && errors.length > 0 && (
        <>
          <EuiSpacer size="xs" />
          <EuiAccordion
            id={`evalsStepErrors-${step.step_id}`}
            data-test-subj="evalsStepErrorsAccordion"
            buttonContent={
              <EuiText size="xs" color="danger">
                {i18n.translate('xpack.evals.runProgress.viewFailures', {
                  defaultMessage: 'View {count, plural, one {# failure} other {# failures}}',
                  values: { count: errors.length },
                })}
              </EuiText>
            }
          >
            <EuiSpacer size="xs" />
            <EuiCodeBlock
              language="text"
              fontSize="s"
              paddingSize="s"
              isCopyable
              overflowHeight={200}
            >
              {errors.join('\n\n')}
            </EuiCodeBlock>
          </EuiAccordion>
        </>
      )}
    </div>
  );
};

const WorkflowExecutionCard: React.FC<{ execution: WorkflowExecutionView; label?: string }> = ({
  execution,
  label,
}) => {
  const { id: workflowExecutionId, data, isError } = execution;
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;
  const cancelMutation = useCancelWorkflowExecution();

  const onCancel = useCallback(() => {
    cancelMutation.mutate(workflowExecutionId, {
      onError: (cancelError) => {
        toasts?.addError(cancelError as Error, {
          title: i18n.translate('xpack.evals.runProgress.cancelError', {
            defaultMessage: 'Failed to cancel run',
          }),
        });
      },
    });
  }, [cancelMutation, toasts, workflowExecutionId]);

  if (isError) {
    return (
      <EuiCallOut
        color="danger"
        size="s"
        title={i18n.translate('xpack.evals.runProgress.loadError', {
          defaultMessage: 'Could not load execution {id}',
          values: { id: workflowExecutionId },
        })}
      />
    );
  }

  if (!data) {
    return (
      <EuiPanel hasBorder paddingSize="m" data-test-subj="evalsWorkflowExecutionCard">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          {label && (
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{label}</strong>
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {workflowExecutionId}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  const running = !isTerminal(data.status);
  const datasetSteps = data.steps.filter((step) => step.step_type === EVALUATE_DATASET_STEP_TYPE);
  const failedSteps = data.steps.filter((step) => step.status === 'failed' && step.error);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="evalsWorkflowExecutionCard">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {label && (
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{label}</strong>
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiBadge color={statusColor(data.status)}>{data.status}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {workflowExecutionId}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {running && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="warning"
              iconType="cross"
              isLoading={cancelMutation.isLoading}
              onClick={onCancel}
              data-test-subj="evalsCancelRunButton"
            >
              {cancelLabel}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {datasetSteps.length > 0 && (
        <>
          <EuiSpacer size="s" />
          {datasetSteps.map((step) => (
            <React.Fragment key={step.step_id}>
              <DatasetStepProgress step={step} />
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </>
      )}

      {data.error && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut color="danger" size="s" title={data.error} />
        </>
      )}

      {failedSteps.map((step) => (
        <React.Fragment key={`err-${step.step_id}`}>
          <EuiSpacer size="s" />
          <EuiCallOut
            color="danger"
            size="s"
            title={i18n.translate('xpack.evals.runProgress.stepFailed', {
              defaultMessage: 'Step "{stepId}" failed',
              values: { stepId: step.step_id },
            })}
          >
            <EuiText size="xs">{step.error}</EuiText>
          </EuiCallOut>
        </React.Fragment>
      ))}
    </EuiPanel>
  );
};

export interface WorkflowRunProgressProps {
  /** Per-execution status views, polled centrally by the page. */
  executions: WorkflowExecutionView[];
  /** Optional human label (e.g. model name) rendered on each card, by execution id. */
  getLabel?: (workflowExecutionId: string) => string | undefined;
}

/**
 * Renders the live progress (per-dataset counters, captured failures, and a
 * cancel action while running) for one or more launched workflow executions. The
 * execution statuses are polled by the parent (see `useWorkflowExecutions`) and
 * passed in, so this component performs no fetching of its own.
 */
export const WorkflowRunProgress: React.FC<WorkflowRunProgressProps> = ({
  executions,
  getLabel,
}) => {
  if (executions.length === 0) {
    return null;
  }

  return (
    <div data-test-subj="evalsWorkflowRunProgress">
      {executions.map((execution) => (
        <React.Fragment key={execution.id}>
          <WorkflowExecutionCard execution={execution} label={getLabel?.(execution.id)} />
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
    </div>
  );
};
