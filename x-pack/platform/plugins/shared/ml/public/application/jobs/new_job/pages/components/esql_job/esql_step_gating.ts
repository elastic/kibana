/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JOB_ID_MAX_LENGTH } from '@kbn/ml-validators';
import { isJobIdValid } from '../../../../../../../common/util/job_utils';
import type { EsqlWizardState } from './esql_wizard_context';
import { NUMERIC_ESQL_TYPES } from './esql_numeric_types';
import { detectorFieldRequirement } from './esql_detector_functions';
import { isDetectorPartitioningValid } from './esql_detector_partitioning';
import { ESQL_WIZARD_STEPS } from './esql_wizard_steps';

const isValidRange = (start: string, end: string) =>
  ![start, end].some((value) => value === '' || value === '0' || value === 'MAX');

/**
 * Whether every configured detector's function+field combination resolves
 * against the current ES|QL output columns and passes by/over/partition
 * validation (client-side only, LEAD DECISION g2sz.10 — server-side PUT
 * validation is authoritative).
 */
export const areDetectorsValid = (state: EsqlWizardState): boolean =>
  state.detectors.length > 0 &&
  state.detectors.every((detector) => {
    const requirement = detectorFieldRequirement(detector.function);

    if (!isDetectorPartitioningValid(detector, state.columns, state.emittedTimeField)) {
      return false;
    }

    if (requirement === 'none') return true;
    if (!detector.field) return false;

    return state.columns.some(
      ({ name, type }) =>
        name === detector.field && (requirement === 'any' || NUMERIC_ESQL_TYPES.has(type))
    );
  });

/** A group id is validated with the same rule as a job id (see `validateGroupNames`). */
export const areGroupsValid = (groups: string[]): boolean => groups.every(isJobIdValid);

export const isJobIdStepValid = (jobId: string): boolean =>
  isJobIdValid(jobId) && jobId.length <= JOB_ID_MAX_LENGTH;

/**
 * Step 1 (Query & time range) is complete once: the query resolved output
 * columns, the wizard time range is valid, and the row-count histogram
 * returned at least one row. A histogram error blocks Next just like an
 * empty histogram — the error is what's shown to the user (LEAD DECISION
 * 2026-09-29, g2sz.10 pass 2).
 */
export const isQueryTimeRangeStepValid = (state: EsqlWizardState): boolean =>
  state.queryProbeState === 'success' &&
  state.columns.length > 0 &&
  isValidRange(state.wizardStart, state.wizardEnd) &&
  state.histogramStatus === 'success' &&
  state.histogramTotalRows > 0;

export type QueryTimeRangeBlockedReason =
  | { type: 'histogramLoading' }
  | { type: 'histogramError'; errorMessage?: string }
  | { type: 'histogramEmpty'; previewHasRows: boolean };

/**
 * Why step 1's Next is disabled when the row-count histogram is the blocker
 * (still loading, errored, or empty); `undefined` when Next is enabled or when
 * another condition (columns, time range) is what blocks it. Explanation only —
 * `isQueryTimeRangeStepValid` remains the single source of truth for gating.
 */
export const getQueryTimeRangeBlockedReason = (
  state: EsqlWizardState
): QueryTimeRangeBlockedReason | undefined => {
  if (
    state.queryProbeState !== 'success' ||
    state.columns.length === 0 ||
    !isValidRange(state.wizardStart, state.wizardEnd)
  ) {
    return undefined;
  }

  if (state.histogramStatus === 'loading') return { type: 'histogramLoading' };
  if (state.histogramStatus === 'error') {
    return { type: 'histogramError', errorMessage: state.histogramErrorMessage };
  }
  if (state.histogramStatus === 'success' && state.histogramTotalRows === 0) {
    return { type: 'histogramEmpty', previewHasRows: (state.outputPreviewRowCount ?? 0) > 0 };
  }

  return undefined;
};

/**
 * Step 2 (Pick fields) is complete once at least one detector is configured
 * and valid, the bucket span and source time field are set, and the emitted
 * time field still resolves against the current columns.
 */
export const isPickFieldsStepValid = (state: EsqlWizardState): boolean =>
  state.sourceTimeField.trim() !== '' &&
  state.bucketSpan.trim() !== '' &&
  state.bucketSpan !== '0' &&
  state.columns.some(({ name }) => name === state.emittedTimeField) &&
  areDetectorsValid(state);

/** Step 3 (Job details) is complete once the job id (and any groups) validate. */
export const isJobDetailsStepValid = (state: EsqlWizardState): boolean =>
  isJobIdStepValid(state.jobId) && areGroupsValid(state.jobGroups);

/**
 * Whether every step is currently satisfied, in order — used both to decide
 * whether `Next` is enabled on the current step and to bound how far
 * `EuiStepsHorizontal` lets the user jump back/forward (`highestStep`).
 */
export const computeEsqlStepGating = (
  state: EsqlWizardState
): Record<ESQL_WIZARD_STEPS, boolean> => ({
  [ESQL_WIZARD_STEPS.QUERY_TIME_RANGE]: isQueryTimeRangeStepValid(state),
  [ESQL_WIZARD_STEPS.PICK_FIELDS]: isPickFieldsStepValid(state),
  [ESQL_WIZARD_STEPS.JOB_DETAILS]: isJobDetailsStepValid(state),
  [ESQL_WIZARD_STEPS.SUMMARY]: true,
});

/** Whether the wizard may advance from `step` to `step + 1`. */
export const canAdvanceFromStep = (state: EsqlWizardState, step: ESQL_WIZARD_STEPS): boolean => {
  const gating = computeEsqlStepGating(state);

  return gating[step] ?? false;
};
