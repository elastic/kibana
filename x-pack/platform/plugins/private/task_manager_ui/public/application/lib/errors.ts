/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface HttpErrorLike {
  body?: { statusCode?: number; message?: string };
  message?: string;
}

const isHttpErrorLike = (error: unknown): error is HttpErrorLike =>
  typeof error === 'object' && error !== null;

export const getErrorStatusCode = (error: unknown): number | undefined =>
  isHttpErrorLike(error) ? error.body?.statusCode : undefined;

export const getErrorMessage = (error: unknown): string | undefined =>
  isHttpErrorLike(error) ? error.body?.message ?? error.message : undefined;
