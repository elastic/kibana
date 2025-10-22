/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boomify } from '@hapi/boom';
import type { ErrorTypes } from '../../types';
import { getStatusCode } from './handle_error';

export function handleSettingsError(err: ErrorTypes) {
  const statusCode = getStatusCode(err);
  return boomify(err, { statusCode });
}
