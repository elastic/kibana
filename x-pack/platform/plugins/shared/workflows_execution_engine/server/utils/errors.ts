/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedError } from '@kbn/workflows';

export function isSerializedError(error: unknown): error is SerializedError {
  return typeof error === 'object' && error !== null && 'type' in error && 'message' in error;
}
