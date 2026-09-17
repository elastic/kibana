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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ExperimentExecutionStepStatus } from '../../../common/experiments/run_experiment';
import { EvaluateDatasetStepId } from '../../../common/workflows/steps';
import { useCancelWorkflowExecution } from '../../hooks/use_experiments_api';
import type { WorkflowExecutionView } from '../../hooks/use_experiments_api';
import {
  CANCEL,
  CANCEL_ERROR,
  datasetCounts,
  loadError,
  stepFailed,
  viewFailures,
} from './translations';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']);
const EVALUATE_DATASET_STEP_TYPE = EvaluateDatasetStepId;

const isTerminal = (status: string) => TERMINAL_STATUSES.has(status);

/** ES-derived live counts used to floor a running step's own (batched) counters. */
interface DatasetProgressFloor {
  scoresIngested: number;
  examplesDone: number;
}

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

const DatasetStepProgress: React.FC<{
  step: ExperimentExecutionStepStatus;
  progressFloor?: DatasetProgressFloor;
}> = ({ step, progressFloor }) => {
  const progress = step.progress;
  const total = progress?.total;
  const errors = progress?.errors;

  const settled = isTerminal(step.status);
  const rawDone = (progress?.completed ?? 0) + (progress?.failed ?? 0);
  // While a batch is in flight the step's own counters read 0, so floor them with
  // the ES-derived live counts to match the streamed results. Once settled the
  // step output is authoritative, so use it as-is.
  const done = settled ? rawDone : Math.max(rawDone, progressFloor?.examplesDone ?? 0);
  const scores = settled
    ? progress?.scores_ingested ?? 0
    : Math.max(progress?.scores_ingested ?? 0, progressFloor?.scoresIngested ?? 0);

  const knownTotal = typeof total === 'number' && total > 0 ? total : undefined;

  const indeterminate = !settled && done === 0;
  const max = indeterminate ? undefined : knownTotal ?? Math.max(done, 1);
  const value = indeterminate ? undefined : settled ? max : done;

  return (
    <div data-test-subj="evalsDatasetStepProgress">
      <EuiText size="xs" color="subdued">
        {datasetCounts({ done, total: total ?? '?', failed: progress?.failed ?? 0, scores })}
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
                {viewFailures(errors.length)}
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

const WorkflowExecutionCard: React.FC<{
  execution: WorkflowExecutionView;
  label?: string;
  progressFloor?: DatasetProgressFloor;
}> = ({ execution, label, progressFloor }) => {
  const { id: workflowExecutionId, data, isError } = execution;
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;
  const cancelMutation = useCancelWorkflowExecution();

  const onCancel = useCallback(() => {
    cancelMutation.mutate(workflowExecutionId, {
      onError: (cancelError) => {
        toasts?.addError(cancelError as Error, {
          title: CANCEL_ERROR,
        });
      },
    });
  }, [cancelMutation, toasts, workflowExecutionId]);

  if (isError) {
    return (
      <EuiCallOut announceOnMount color="danger" size="s" title={loadError(workflowExecutionId)} />
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
              {CANCEL}
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {datasetSteps.length > 0 && (
        <>
          <EuiSpacer size="s" />
          {datasetSteps.map((step) => (
            <React.Fragment key={step.step_id}>
              <DatasetStepProgress step={step} progressFloor={progressFloor} />
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </>
      )}

      {data.error && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut announceOnMount color="danger" size="s" title={data.error} />
        </>
      )}

      {failedSteps.map((step) => (
        <React.Fragment key={`err-${step.step_id}`}>
          <EuiSpacer size="s" />
          <EuiCallOut announceOnMount color="danger" size="s" title={stepFailed(step.step_id)}>
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
  /**
   * ES-derived live counts used to floor the step's own counters, which read 0
   * during an in-flight batch. Applied only to single-dataset-step runs.
   */
  progressFloor?: DatasetProgressFloor;
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
  progressFloor,
}) => {
  if (executions.length === 0) {
    return null;
  }

  const datasetStepCount = executions.reduce(
    (count, execution) =>
      count +
      (execution.data?.steps.filter((step) => step.step_type === EVALUATE_DATASET_STEP_TYPE)
        .length ?? 0),
    0
  );
  // The floor is an experiment-wide total, so only attribute it when there is a
  // single dataset step to attribute it to.
  const floor = datasetStepCount === 1 ? progressFloor : undefined;

  return (
    <div data-test-subj="evalsWorkflowRunProgress">
      {executions.map((execution) => (
        <React.Fragment key={execution.id}>
          <WorkflowExecutionCard
            execution={execution}
            label={getLabel?.(execution.id)}
            progressFloor={floor}
          />
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
    </div>
  );
};
