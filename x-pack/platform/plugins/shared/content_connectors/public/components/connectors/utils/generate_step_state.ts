/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiStepStatus } from '@elastic/eui';

type Steps = 'start' | 'configure' | 'deployment' | 'finish';

export const generateStepState = (currentStep: Steps): { [key in Steps]: EuiStepStatus } => {
  return {
    configure:
      currentStep === 'start' || currentStep === 'deployment'
        ? 'incomplete'
        : currentStep === 'configure'
        ? 'current'
        : 'complete',
    deployment:
      currentStep === 'deployment'
        ? 'current'
        : currentStep === 'finish' || currentStep === 'configure'
        ? 'complete'
        : 'incomplete',
    finish: currentStep === 'finish' ? 'current' : 'incomplete',
    start: currentStep === 'start' ? 'current' : 'complete',
  };
};
