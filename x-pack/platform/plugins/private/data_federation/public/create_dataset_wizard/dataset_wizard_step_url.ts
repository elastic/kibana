/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADDITIONAL_SETTINGS_STEP,
  DATA_SOURCE_STEP,
  FLOW_3_REVIEW_STEP,
  LOGISTICS_STEP,
  PREVIEW_RESULTS_STEP,
  REVIEW_STEP,
  SCHEMA_MAPPINGS_STEP,
} from './dataset_wizard_constants';
import {
  hasDatasetWizardPreviewResultsStep,
  isDatasetWizardFlow4,
  type DatasetWizardFlowVariant,
} from './dataset_wizard_flow_variant';

export const WIZARD_STEP_SEARCH_PARAM = 'step';

export type DatasetWizardStep =
  | typeof LOGISTICS_STEP
  | typeof DATA_SOURCE_STEP
  | typeof ADDITIONAL_SETTINGS_STEP
  | typeof SCHEMA_MAPPINGS_STEP
  | typeof PREVIEW_RESULTS_STEP
  | typeof REVIEW_STEP
  | typeof FLOW_3_REVIEW_STEP;

export const getReviewStep = (flowVariant: DatasetWizardFlowVariant): DatasetWizardStep =>
  hasDatasetWizardPreviewResultsStep(flowVariant) ? FLOW_3_REVIEW_STEP : REVIEW_STEP;

export const getWizardSteps = (flowVariant: DatasetWizardFlowVariant): DatasetWizardStep[] => {
  if (isDatasetWizardFlow4(flowVariant)) {
    return [
      LOGISTICS_STEP,
      DATA_SOURCE_STEP,
      ADDITIONAL_SETTINGS_STEP,
      SCHEMA_MAPPINGS_STEP,
      PREVIEW_RESULTS_STEP,
      FLOW_3_REVIEW_STEP,
    ];
  }

  return hasDatasetWizardPreviewResultsStep(flowVariant)
    ? [
        LOGISTICS_STEP,
        ADDITIONAL_SETTINGS_STEP,
        SCHEMA_MAPPINGS_STEP,
        PREVIEW_RESULTS_STEP,
        FLOW_3_REVIEW_STEP,
      ]
    : [LOGISTICS_STEP, ADDITIONAL_SETTINGS_STEP, SCHEMA_MAPPINGS_STEP, REVIEW_STEP];
};

/**
 * Position of a step within a flow. Step ids are not ordered, so anything that
 * compares steps has to go through the flow's step list.
 */
export const getWizardStepPosition = (
  step: DatasetWizardStep,
  flowVariant: DatasetWizardFlowVariant
): number => getWizardSteps(flowVariant).indexOf(step);

export const isWizardStepAfter = (
  step: DatasetWizardStep,
  other: DatasetWizardStep,
  flowVariant: DatasetWizardFlowVariant
): boolean => getWizardStepPosition(step, flowVariant) > getWizardStepPosition(other, flowVariant);

export const getNextWizardStep = (
  step: DatasetWizardStep,
  flowVariant: DatasetWizardFlowVariant
): DatasetWizardStep | undefined => {
  const steps = getWizardSteps(flowVariant);

  return steps[steps.indexOf(step) + 1];
};

export const getPreviousWizardStep = (
  step: DatasetWizardStep,
  flowVariant: DatasetWizardFlowVariant
): DatasetWizardStep | undefined => {
  const position = getWizardStepPosition(step, flowVariant);

  return position > 0 ? getWizardSteps(flowVariant)[position - 1] : undefined;
};

/**
 * The step search param is the 1-based position within the flow, not the step
 * id, so the number in the URL matches the number in the stepper.
 */
export const parseWizardStepFromSearch = (
  search: string,
  flowVariant: DatasetWizardFlowVariant
): DatasetWizardStep | undefined => {
  const params = new URLSearchParams(search);
  const rawPosition = params.get(WIZARD_STEP_SEARCH_PARAM);

  if (!rawPosition) {
    return undefined;
  }

  const position = Number.parseInt(rawPosition, 10);
  if (!Number.isFinite(position) || position < 1) {
    return undefined;
  }

  return getWizardSteps(flowVariant)[position - 1];
};

export const buildWizardStepSearch = (
  search: string,
  step: DatasetWizardStep,
  flowVariant: DatasetWizardFlowVariant
): string => {
  const params = new URLSearchParams(search);
  const position = getWizardStepPosition(step, flowVariant) + 1;

  if (position <= 1) {
    params.delete(WIZARD_STEP_SEARCH_PARAM);
  } else {
    params.set(WIZARD_STEP_SEARCH_PARAM, String(position));
  }

  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
};
