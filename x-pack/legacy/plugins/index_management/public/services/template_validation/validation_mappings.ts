/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Template } from '../../../common/types';
import { TemplateValidation } from './types';
import { isStringEmpty, removeEmptyErrorFields, isValid, validateJSON } from './validation_helpers';

export const validateMappings = (template: Template): TemplateValidation => {
  const { mappings } = template;

  const validation: TemplateValidation = {
    isValid: true,
    errors: {
      mappings: [],
    },
  };

  // Mappings JSON validation
  if (typeof mappings === 'string' && !isStringEmpty(mappings)) {
    const validationMsg = validateJSON(mappings);

    if (typeof validationMsg === 'string') {
      validation.errors.mappings.push(validationMsg);
    }
  }

  validation.errors = removeEmptyErrorFields(validation.errors);
  validation.isValid = isValid(validation.errors);

  return validation;
};
