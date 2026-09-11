/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, conflict, notFound, serverUnavailable } from '@hapi/boom';
import {
  InvestigationConflictError,
  InvestigationNotFoundError,
  InvestigationSubjectMissingError,
  InvestigationUnavailableError,
  InvalidInvestigationContextError,
} from '../client/errors';

export function rethrowInvestigationClientError(error: unknown): never {
  if (error instanceof InvestigationNotFoundError) {
    throw notFound(error.message);
  }
  if (error instanceof InvestigationSubjectMissingError) {
    throw badRequest(error.message);
  }
  if (error instanceof InvestigationConflictError) {
    throw conflict(error.message);
  }
  if (error instanceof InvalidInvestigationContextError) {
    throw badRequest(error.message);
  }
  if (error instanceof InvestigationUnavailableError) {
    throw serverUnavailable(error.message);
  }
  throw error;
}
