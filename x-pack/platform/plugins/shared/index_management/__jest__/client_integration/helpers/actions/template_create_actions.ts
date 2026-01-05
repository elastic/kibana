/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wizardSteps } from './wizard_steps';

/**
 * Actions for interacting with the template create wizard.
 *
 * This factory returns the shared wizard step actions to maintain compatibility
 * with existing tests while centralizing the implementation.
 */
export const createTemplateCreateActions = () => {
  return {
    completeStepOne: wizardSteps.completeStepOne,
    completeStepTwo: wizardSteps.completeStepTwo,
    completeStepThree: wizardSteps.completeStepThree,
    completeStepFour: wizardSteps.completeStepFour,
    completeStepFive: wizardSteps.completeStepFive,
  };
};
