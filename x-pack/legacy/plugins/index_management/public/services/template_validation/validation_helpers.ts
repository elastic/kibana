/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TemplateValidation } from './types';

export const removeEmptyErrorFields = (errors: TemplateValidation['errors']) => {
  return Object.entries(errors)
    .filter(([_key, value]) => value.length > 0)
    .reduce((errs: TemplateValidation['errors'], [key, value]) => {
      errs[key] = value;
      return errs;
    }, {});
};

export const isValid = (errors: TemplateValidation['errors']) => {
  return Boolean(Object.keys(errors).length === 0);
};

export const isStringEmpty = (str: string | null): boolean => {
  return str ? !Boolean(str.trim()) : true;
};

export const validateJSON = (jsonString: string) => {
  const invalidJsonMsg = i18n.translate('xpack.idxMgmt.templateValidation.invalidJSONError', {
    defaultMessage: 'Invalid JSON format.',
  });

  try {
    const parsedSettingsJson = JSON.parse(jsonString);
    if (parsedSettingsJson && typeof parsedSettingsJson !== 'object') {
      return invalidJsonMsg;
    }
    return;
  } catch (e) {
    return invalidJsonMsg;
  }
};
