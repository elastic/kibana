/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Which class of failure an S3 error code belongs to.
 *
 * An S3 destination reports the code of the error it got as `error.type`. It is the code that
 * decides the class, and not the HTTP status, because the same family of failures comes back as a
 * 400 (`ExpiredToken`, `InvalidToken`) and as a 403.
 *
 * The codes are from the S3 error list in the AWS documentation. The class of each one is a
 * judgement, not something AWS defines. `RequestTimeTooSkewed` is a clock problem that looks like a
 * credential problem, and `NotSignedUp` is the state of the account.
 *
 * A code that is not here has no class. That covers the other S3 codes (`NoSuchBucket`,
 * `SlowDown`, ...), the exporter's own words (`timeout`, `dns`, ...), and the errors of looking up
 * credentials, which are not in the S3 list and have their own codes.
 */
export type S3AuthFailureClass = 'authentication' | 'authorization';

/** The credentials are missing, unknown or expired, or the request is signed wrongly. */
export const S3_AUTHENTICATION_ERROR_CODES: readonly string[] = [
  'InvalidAccessKeyId',
  'SignatureDoesNotMatch',
  'InvalidSignature',
  'UnsupportedSignature',
  'MissingAuthenticationToken',
  'InvalidSecurity',
  'InvalidToken',
  'ExpiredToken',
  'TokenRefreshRequired',
  'CredentialsNotSupported',
  'InvalidSessionException',
  'RequestTimeTooSkewed',
];

/** The caller is known, and is not allowed, or the account blocks the request. */
export const S3_AUTHORIZATION_ERROR_CODES: readonly string[] = [
  'AccessDenied',
  'AllAccessDisabled',
  'AccountProblem',
  'InvalidPayer',
  'NotSignedUp',
  'UnauthorizedAccessError',
];

const authenticationCodes = new Set(S3_AUTHENTICATION_ERROR_CODES);
const authorizationCodes = new Set(S3_AUTHORIZATION_ERROR_CODES);

/**
 * The class of an S3 error code, or nothing when it has none. A set, because a code comes from the
 * destination's metrics and must not be read from `Object.prototype`.
 */
export const getS3AuthFailureClass = (code: string | null): S3AuthFailureClass | undefined => {
  if (code === null) return undefined;
  if (authenticationCodes.has(code)) return 'authentication';
  if (authorizationCodes.has(code)) return 'authorization';
};
