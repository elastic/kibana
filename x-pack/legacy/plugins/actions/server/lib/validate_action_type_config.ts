/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ActionType } from '../types';

export function validateActionTypeConfig<T extends Record<string, any>>(
  actionType: ActionType,
  config: T
): T {
  const validator = actionType.validate && actionType.validate.config;
  if (!validator) {
    return config;
  }

  try {
    return validator.validate(config);
  } catch (err) {
    throw Boom.badRequest(`The actionTypeConfig is invalid: ${err.message}`);
  }
}
