/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ErrorResponse } from '@kbn/alerting-v2-schemas';

/**
 * True when a rule fetch failed because the current user lacks the privileges
 * required to read rules (HTTP 403). Used to surface an explanatory callout
 * instead of a generic error to users who can view episodes but not rules.
 */
export const isRuleForbiddenError = (error: unknown): boolean => {
  const httpError = error as IHttpFetchError<ErrorResponse> | undefined;

  return httpError?.response?.status === 403;
};
