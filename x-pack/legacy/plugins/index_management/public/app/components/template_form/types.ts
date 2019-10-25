/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Template } from '../../../../common/types';

export interface StepProps {
  template: Partial<Template>;
  setDataGetter: (dataGetter: DataGetterFunc) => void;
  updateCurrentStep: (step: number) => void;
  onStepValidityChange: (isValid: boolean) => void;
  isEditing?: boolean;
}

export type DataGetterFunc = () => Promise<{ isValid: boolean; data: any }>;
