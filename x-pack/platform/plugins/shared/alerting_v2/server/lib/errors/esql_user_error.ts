/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isResponseError } from '@kbn/es-errors';

// 400: syntax/semantic ES|QL query errors (verification_exception, parsing_exception)
// 404: unknown index referenced in the query
const USER_ERROR_STATUS_CODES = new Set<number | undefined>([400, 401, 403, 404]);

export const isEsqlUserError = (error: unknown): boolean =>
  isResponseError(error) && USER_ERROR_STATUS_CODES.has(error.statusCode);
