/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADDITIONAL_SETTINGS_STEP,
  LOGISTICS_STEP,
  REVIEW_STEP,
  SCHEMA_MAPPINGS_STEP,
} from './dataset_wizard_constants';

export const WIZARD_STEP_SEARCH_PARAM = 'step';

export type DatasetWizardStep =
  | typeof LOGISTICS_STEP
  | typeof ADDITIONAL_SETTINGS_STEP
  | typeof SCHEMA_MAPPINGS_STEP
  | typeof REVIEW_STEP;

const WIZARD_STEPS: DatasetWizardStep[] = [
  LOGISTICS_STEP,
  ADDITIONAL_SETTINGS_STEP,
  SCHEMA_MAPPINGS_STEP,
  REVIEW_STEP,
];

export const isDatasetWizardStep = (value: number): value is DatasetWizardStep =>
  WIZARD_STEPS.includes(value as DatasetWizardStep);

export const parseWizardStepFromSearch = (search: string): DatasetWizardStep | undefined => {
  const params = new URLSearchParams(search);
  const rawStep = params.get(WIZARD_STEP_SEARCH_PARAM);

  if (!rawStep) {
    return undefined;
  }

  const parsedStep = Number.parseInt(rawStep, 10);
  if (!Number.isFinite(parsedStep) || !isDatasetWizardStep(parsedStep)) {
    return undefined;
  }

  return parsedStep;
};

export const buildWizardStepSearch = (search: string, step: DatasetWizardStep): string => {
  const params = new URLSearchParams(search);

  if (step === LOGISTICS_STEP) {
    params.delete(WIZARD_STEP_SEARCH_PARAM);
  } else {
    params.set(WIZARD_STEP_SEARCH_PARAM, String(step));
  }

  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
};
