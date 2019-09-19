/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Template } from '../../../common/types';
import { TemplateValidation } from './types';
import { isStringEmpty, removeEmptyErrorFields, isValid, validateJSON } from './validation_helpers';

export const validateAliases = (template: Template): TemplateValidation => {
  const { aliases } = template;

  const validation: TemplateValidation = {
    isValid: true,
    errors: {
      aliases: [],
    },
  };

  // Aliases JSON validation
  if (typeof aliases === 'string' && !isStringEmpty(aliases)) {
    const validationMsg = validateJSON(aliases);

    if (typeof validationMsg === 'string') {
      validation.errors.aliases.push(validationMsg);
    }
  }

  validation.errors = removeEmptyErrorFields(validation.errors);
  validation.isValid = isValid(validation.errors);

  return validation;
};
