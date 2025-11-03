/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlmPolicyPayload } from '../../../../../common/types';
import type { PolicyValidation, ValidatePolicyHelperData } from '../../../services/validation';

export interface StepProps {
  policy: SlmPolicyPayload;
  indices: string[];
  dataStreams: string[];
  updatePolicy: (
    updatedSettings: Partial<SlmPolicyPayload>,
    validationHelperData?: ValidatePolicyHelperData
  ) => void;
  isEditing: boolean;
  currentUrl: string;
  errors: PolicyValidation['errors'];
  updateCurrentStep: (step: number) => void;
}

export { PolicyStepLogistics } from './step_logistics';
export { PolicyStepSettings } from './step_settings';
export { PolicyStepRetention } from './step_retention';
export { PolicyStepReview } from './step_review';
