/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Errors } from 'io-ts';
import { failure } from 'io-ts/lib/PathReporter';

export const createPlainError = (message: string) => new Error(message);

export const throwErrors = (createError: (message: string) => Error) => (errors: Errors) => {
  throw createError(failure(errors).join('\n'));
};
