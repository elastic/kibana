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
  const { error, value } = validator.validate(config);
  if (error) {
    if (error.details == null) {
      throw Boom.badRequest(`The actionTypeConfig is invalid: ${error.message}`);
    }
    const invalidPaths = error.details.map(
      (details: any) => `${details.path.join('.')} [${details.type}]`
    );
    throw Boom.badRequest(
      `The following actionTypeConfig attributes are invalid: ${invalidPaths.join(', ')}`
    );
  }
  return value;
}
