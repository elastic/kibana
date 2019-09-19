/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Template } from '../../../common/types';
import { TemplateValidation } from './types';
import { isStringEmpty, removeEmptyErrorFields, isValid, validateJSON } from './validation_helpers';

export const validateSettings = (template: Template): TemplateValidation => {
  const { settings } = template;

  const validation: TemplateValidation = {
    isValid: true,
    errors: {
      settings: [],
    },
  };

  // Settings JSON validation
  if (typeof settings === 'string' && !isStringEmpty(settings)) {
    const validationMsg = validateJSON(settings);

    if (typeof validationMsg === 'string') {
      validation.errors.settings.push(validationMsg);
    }
  }

  validation.errors = removeEmptyErrorFields(validation.errors);
  validation.isValid = isValid(validation.errors);

  return validation;
};
