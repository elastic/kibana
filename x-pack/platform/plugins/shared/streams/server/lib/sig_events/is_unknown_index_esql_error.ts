/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const getElasticsearchErrorType = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const body = (error as { body?: { error?: { type?: string } } }).body;
  return body?.error?.type;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return String(error);
};

/**
 * Returns true when an ES|QL query failed because the backing index or data
 * stream does not exist yet. Hidden system data streams are created lazily on
 * first write, so reads before any document is indexed are expected.
 */
export const isUnknownIndexEsqlError = (error: unknown): boolean => {
  const message = getErrorMessage(error);

  if (message.includes('Unknown index') || message.includes('index_not_found_exception')) {
    return true;
  }

  const errorType = getElasticsearchErrorType(error);
  if (errorType === 'index_not_found_exception') {
    return true;
  }

  if (errorType === 'verification_exception' && message.includes('Unknown index')) {
    return true;
  }

  const statusCode = (error as { statusCode?: number }).statusCode;
  return statusCode === 404 && message.toLowerCase().includes('index');
};
