/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, IToasts } from '@kbn/core/public';

export const getHttpFetchErrorMessage = (error: unknown): string | undefined => {
  const httpError = error as IHttpFetchError<{ message?: string }>;
  return httpError.body?.message;
};

export const addHttpFetchErrorToast = (
  toasts: Pick<IToasts, 'addDanger'>,
  title: string,
  error: unknown
): void => {
  const serverMessage = getHttpFetchErrorMessage(error);
  if (serverMessage) {
    toasts.addDanger({ title, text: serverMessage });
  } else {
    toasts.addDanger(title);
  }
};
