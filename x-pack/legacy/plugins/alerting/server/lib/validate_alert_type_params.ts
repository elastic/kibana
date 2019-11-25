/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { AlertType } from '../types';

export function validateAlertTypeParams<T extends Record<string, any>>(
  alertType: AlertType,
  params: T
): T {
  const validator = alertType.validate && alertType.validate.params;
  if (!validator) {
    return params;
  }

  try {
    return validator.validate(params);
  } catch (err) {
    throw Boom.badRequest(`params invalid: ${err.message}`);
  }
}
