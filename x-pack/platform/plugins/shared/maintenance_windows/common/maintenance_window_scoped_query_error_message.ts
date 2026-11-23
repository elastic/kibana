/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const errorMessageIdentifier = 'invalid scope';

const VALID_SCOPE_NAMES = ['alerting', 'alertingV2'] as const;

export type MaintenanceWindowScopeName = (typeof VALID_SCOPE_NAMES)[number];

export interface ScopedQueryErrorAttributes {
  scopeErrors: ReadonlyArray<{ scope: MaintenanceWindowScopeName; message: string }>;
}

export const getScopedQueryErrorMessage = (errorMessage: string) => {
  return `${errorMessageIdentifier} - ${errorMessage}`;
};

export const isScopedQueryError = (errorMessage: string) => {
  return errorMessage.includes(errorMessageIdentifier);
};

export const getScopedQueryErrorAttributes = (
  scope: MaintenanceWindowScopeName,
  message: string
): ScopedQueryErrorAttributes => {
  return { scopeErrors: [{ scope, message }] };
};

export const isScopedQueryErrorAttributes = (
  attributes: unknown
): attributes is ScopedQueryErrorAttributes => {
  if (!attributes || typeof attributes !== 'object') return false;
  const { scopeErrors } = attributes as Record<string, unknown>;
  if (!Array.isArray(scopeErrors) || scopeErrors.length === 0) return false;
  return scopeErrors.every(
    (e) =>
      e !== null &&
      typeof e === 'object' &&
      typeof (e as Record<string, unknown>).scope === 'string' &&
      VALID_SCOPE_NAMES.includes((e as Record<string, unknown>).scope as MaintenanceWindowScopeName)
  );
};
