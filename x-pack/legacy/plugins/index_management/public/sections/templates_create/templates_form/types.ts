/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Template } from '../../../../common/types';
import { TemplateValidation } from '../../../services/validation';

export interface StepProps {
  template: Template;
  updateTemplate: (updatedTemplate: Partial<Template>) => void;
  updateCurrentStep: (step: number) => void;
  errors: TemplateValidation['errors'];
  children?: React.ReactElement<any>;
}
