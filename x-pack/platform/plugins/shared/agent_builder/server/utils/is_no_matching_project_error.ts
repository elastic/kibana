/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isNoMatchingProjectError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const castError = error as {
    attributes?: {
      caused_by?: { type?: string };
      error?: { caused_by?: { type?: string } };
    };
    message?: string;
    meta?: {
      body?: {
        error?: {
          type?: string;
          caused_by?: { type?: string };
        };
      };
    };
  };

  return (
    castError.attributes?.caused_by?.type === 'no_matching_project_exception' ||
    castError.attributes?.error?.caused_by?.type === 'no_matching_project_exception' ||
    castError.meta?.body?.error?.type === 'no_matching_project_exception' ||
    castError.meta?.body?.error?.caused_by?.type === 'no_matching_project_exception' ||
    (typeof castError.message === 'string' &&
      castError.message.includes('no_matching_project_exception'))
  );
};
