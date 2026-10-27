/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ShortTermMemoryIdentityError } from './identity_error';
import { ShortTermMemoryNotFoundError } from './not_found_error';

export { ShortTermMemoryIdentityError, ShortTermMemoryNotFoundError };

export const isShortTermMemoryError = (
  error: unknown
): error is ShortTermMemoryIdentityError | ShortTermMemoryNotFoundError =>
  error instanceof ShortTermMemoryIdentityError || error instanceof ShortTermMemoryNotFoundError;
