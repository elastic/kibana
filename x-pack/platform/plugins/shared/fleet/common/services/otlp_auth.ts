/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTLP_AUTHORIZATION_HEADER, otlpAuthType } from '../constants/output';
import type { OtlpOutputAuth } from '../types/models/output';

// RFC 9110 field name (token): the header is sent as an HTTP header or as gRPC metadata
const OTLP_HEADER_NAME_REGEX = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export const OTLP_HEADER_NAME_MAX_LENGTH = 256;

/** Whether a name can be the name of a header of the OTLP exporter. */
export const isValidOtlpHeaderName = (name: string): boolean =>
  name.length <= OTLP_HEADER_NAME_MAX_LENGTH && OTLP_HEADER_NAME_REGEX.test(name);

// a control character, such as the line break of a pasted value, makes the header invalid
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTER_REGEX = /[\u0000-\u001f\u007f]/;

/** Whether a credential can be the value of a header: it has no control characters. */
export const isValidOtlpAuthCredential = (credential: string): boolean =>
  !CONTROL_CHARACTER_REGEX.test(credential);

/** The name of the header that carries the credential of the authentication. */
export const getOtlpAuthHeaderName = (auth: OtlpOutputAuth): string =>
  auth.type === otlpAuthType.AuthHeader ? OTLP_AUTHORIZATION_HEADER : auth.name;

/** The header of `headers` that has the name of the authentication header, whatever its case. */
export const findOtlpAuthHeaderConflict = (
  headerNames: string[],
  authHeaderName: string
): string | undefined => {
  const name = authHeaderName.toLowerCase();
  return headerNames.find((headerName) => headerName.toLowerCase() === name);
};
