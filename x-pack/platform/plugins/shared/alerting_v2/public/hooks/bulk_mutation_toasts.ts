/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, IToasts } from '@kbn/core/public';

const getHttpFetchErrorMessage = (error: unknown): string | undefined => {
  const httpError = error as IHttpFetchError<{ message?: string }>;
  return httpError.body?.message;
};

/**
 * Shows a danger toast for a failed bulk rules mutation. Surfaces the server's
 * `body.message` as the toast text when available, so the caller sees why the
 * operation failed; otherwise falls back to the plain title.
 *
 * Shared by the bulk rules mutation hooks (enable/disable, delete, update API
 * key) so the toast shape stays consistent across them.
 */
export const addBulkMutationDangerToast = (
  toasts: Pick<IToasts, 'addDanger'>,
  title: string,
  error: unknown
) => {
  const serverMessage = getHttpFetchErrorMessage(error);
  if (serverMessage) {
    toasts.addDanger({ title, text: serverMessage });
  } else {
    toasts.addDanger(title);
  }
};
