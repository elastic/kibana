/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { isString, isNumber, capitalize } from 'lodash';

export function getRequiredFieldError(field) {
  return i18n.translate('xpack.monitoring.alerts.createEmailAction.requiredFieldError', {
    defaultMessage: '{field} is a required field.',
    values: {
      field: capitalize(field),
    }
  });
}

export function getMissingFieldErrors(data, defaultData) {
  const errors = {};

  for (const key in data) {
    if (!data.hasOwnProperty(key)) {
      continue;
    }

    if (isString(defaultData[key])) {
      if (!data[key] || data[key].length === 0) {
        errors[key] = getRequiredFieldError(key);
      }
    }
    else if (isNumber(defaultData[key])) {
      if (isNaN(data[key]) || data[key] === 0) {
        errors[key] = getRequiredFieldError(key);
      }
    }
  }

  return errors;
}

export function hasErrors(errors) {
  for (const error in errors) {
    if (error.length) {
      return true;
    }
  }
  return false;
}
