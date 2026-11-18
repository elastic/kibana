/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ApplyError } from './types';

/**
 * Client errors about the request itself, which the same files send again. Others, such as a 401 or
 * 403 from an expired credential or a write block on the index, can go away before a retry.
 */
const PERMANENT_CLIENT_STATUS_CODES: ReadonlySet<number> = new Set([400, 413, 422]);

const CONFLICT_STATUS_CODE = 409;

/**
 * Describes an error that writing a resource threw. A client error about the request, such as a
 * body the API rejects or a limit it enforces, is `permanent`, since applying the same files again
 * gets the same answer. A conflict is marked `conflict`, since the write created nothing.
 */
export const toApplyError = (
  error: unknown
): Pick<ApplyError, 'message' | 'permanent' | 'conflict'> => {
  const statusCode = Boom.isBoom(error) ? error.output.statusCode : undefined;
  const permanent = statusCode !== undefined && PERMANENT_CLIENT_STATUS_CODES.has(statusCode);
  const conflict = statusCode === CONFLICT_STATUS_CODE;
  return {
    message: error instanceof Error ? error.message : String(error),
    ...(permanent && { permanent }),
    ...(conflict && { conflict }),
  };
};
