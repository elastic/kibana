/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AddInferencePipelineSteps } from './types';
import { ADD_INFERENCE_PIPELINE_STEPS } from './constants';

export function getSteps(
  step: AddInferencePipelineSteps,
  isConfigureStepValid: boolean,
  isPipelineDataValid: boolean,
  hasProcessorStep: boolean
) {
  let nextStep: AddInferencePipelineSteps | undefined;
  let previousStep: AddInferencePipelineSteps | undefined;
  let isContinueButtonEnabled = false;

  switch (step) {
    case ADD_INFERENCE_PIPELINE_STEPS.DETAILS:
      nextStep = hasProcessorStep
        ? ADD_INFERENCE_PIPELINE_STEPS.CONFIGURE_PROCESSOR
        : ADD_INFERENCE_PIPELINE_STEPS.ON_FAILURE;
      isContinueButtonEnabled = isConfigureStepValid;
      break;
    case ADD_INFERENCE_PIPELINE_STEPS.CONFIGURE_PROCESSOR:
      nextStep = ADD_INFERENCE_PIPELINE_STEPS.ON_FAILURE;
      previousStep = ADD_INFERENCE_PIPELINE_STEPS.DETAILS;
      isContinueButtonEnabled = isPipelineDataValid;
      break;
    case ADD_INFERENCE_PIPELINE_STEPS.ON_FAILURE:
      nextStep = ADD_INFERENCE_PIPELINE_STEPS.TEST;
      previousStep = hasProcessorStep
        ? ADD_INFERENCE_PIPELINE_STEPS.CONFIGURE_PROCESSOR
        : ADD_INFERENCE_PIPELINE_STEPS.DETAILS;
      isContinueButtonEnabled = isPipelineDataValid;
      break;
    case ADD_INFERENCE_PIPELINE_STEPS.TEST:
      nextStep = ADD_INFERENCE_PIPELINE_STEPS.CREATE;
      previousStep = ADD_INFERENCE_PIPELINE_STEPS.ON_FAILURE;
      isContinueButtonEnabled = true;
      break;
    case ADD_INFERENCE_PIPELINE_STEPS.CREATE:
      previousStep = ADD_INFERENCE_PIPELINE_STEPS.TEST;
      isContinueButtonEnabled = true;
      break;
  }

  return { nextStep, previousStep, isContinueButtonEnabled };
}
