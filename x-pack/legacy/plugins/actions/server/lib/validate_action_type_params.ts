/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ActionType } from '../types';

export function validateActionTypeParams<T extends Record<string, any>>(
  actionType: ActionType,
  params: T
): T {
  const validator = actionType.validate && actionType.validate.params;
  if (!validator) {
    return params;
  }
  const { error, value } = validator.validate(params);
  if (error) {
    throw Boom.badRequest(`The actionParams is invalid: ${error.message}`);
  }
  return value;
}
