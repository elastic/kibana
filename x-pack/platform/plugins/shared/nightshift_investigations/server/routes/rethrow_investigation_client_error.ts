/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, notFound } from '@hapi/boom';
import {
  InvestigationNotFoundError,
  InvestigationSubjectMissingError,
} from '../client/investigations_client';

export const rethrowInvestigationClientError = (error: unknown): never => {
  if (error instanceof InvestigationNotFoundError) {
    throw notFound(error.message);
  }
  if (error instanceof InvestigationSubjectMissingError) {
    throw badRequest(error.message);
  }
  throw error;
};
