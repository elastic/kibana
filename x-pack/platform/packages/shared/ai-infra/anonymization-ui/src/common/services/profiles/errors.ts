/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectRecord } from '../../utils/is_object_record';
import { getHttpErrorBody, getHttpStatusCode } from '../http_error_utils';

export type ProfilesApiErrorKind =
  | 'conflict'
  | 'forbidden'
  | 'unauthorized'
  | 'not_found'
  | 'network'
  | 'unknown';

export interface ProfilesApiError extends Error {
  kind: ProfilesApiErrorKind;
  statusCode?: number;
  body?: unknown;
}

const PROFILES_API_ERROR_KINDS: readonly ProfilesApiErrorKind[] = [
  'conflict',
  'forbidden',
  'unauthorized',
  'not_found',
  'network',
  'unknown',
];

const isProfilesApiErrorKind = (kind: unknown): kind is ProfilesApiErrorKind =>
  typeof kind === 'string' &&
  PROFILES_API_ERROR_KINDS.some((candidateKind) => candidateKind === kind);

const toMessage = (statusCode?: number, body?: unknown) => {
  if (isObjectRecord(body) && typeof body.message === 'string') {
    return body.message;
  }

  if (statusCode) {
    return `Profiles API request failed with status ${statusCode}`;
  }

  return 'Profiles API request failed';
};

const toUnknownErrorMessage = (error: unknown, fallbackMessage?: string): string => {
  if (
    isObjectRecord(error) &&
    typeof error.message === 'string' &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return fallbackMessage ?? 'Profiles API request failed';
};

class ProfilesApiErrorImpl extends Error implements ProfilesApiError {
  constructor(
    public kind: ProfilesApiErrorKind,
    public statusCode: number | undefined,
    public body: unknown
  ) {
    super(toMessage(statusCode, body));
    this.name = 'ProfilesApiError';
  }
}

export const isProfilesApiError = (error: unknown): error is ProfilesApiError => {
  if (!isObjectRecord(error)) {
    return false;
  }

  return isProfilesApiErrorKind(error.kind);
};

const createUnknownProfilesApiError = (
  error: unknown,
  fallbackMessage?: string
): ProfilesApiError => {
  const unknownError = new Error(toUnknownErrorMessage(error, fallbackMessage)) as ProfilesApiError;
  unknownError.name = 'ProfilesApiError';
  unknownError.kind = 'unknown';
  unknownError.statusCode = undefined;
  unknownError.body = undefined;
  return unknownError;
};

export const mapProfilesApiError = (error: unknown): ProfilesApiError => {
  const statusCode = getHttpStatusCode(error);
  const body = getHttpErrorBody(error);

  if (statusCode === 409) {
    return new ProfilesApiErrorImpl('conflict', statusCode, body);
  }

  if (statusCode === 403) {
    return new ProfilesApiErrorImpl('forbidden', statusCode, body);
  }

  if (statusCode === 401) {
    return new ProfilesApiErrorImpl('unauthorized', statusCode, body);
  }

  if (statusCode === 404) {
    return new ProfilesApiErrorImpl('not_found', statusCode, body);
  }

  if (statusCode === 0 || !statusCode) {
    return new ProfilesApiErrorImpl('network', statusCode, body);
  }

  return new ProfilesApiErrorImpl('unknown', statusCode, body);
};

export const ensureProfilesApiError = (
  error: unknown,
  fallbackMessage?: string
): ProfilesApiError => {
  if (isProfilesApiError(error)) {
    return error;
  }

  const statusCode = getHttpStatusCode(error);
  if (typeof statusCode === 'number') {
    return mapProfilesApiError(error);
  }

  return createUnknownProfilesApiError(error, fallbackMessage);
};
