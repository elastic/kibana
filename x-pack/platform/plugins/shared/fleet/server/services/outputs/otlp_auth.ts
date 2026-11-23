/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OTLP_AUTH_SCHEME_PREFIX,
  OTLP_AUTHORIZATION_HEADER,
  otlpAuthType,
} from '../../../common/constants';
import type { OtlpOutputAuth, SOSecret } from '../../../common/types';
import { OutputInvalidError } from '../../errors';
import { toCompiledSecretRef } from '../secrets/common';
import { isManagedOtlpEndpoint } from '../utils/managed_otlp';

/** The name of the header that carries the credential of the authentication. */
export function getOtlpAuthHeaderName(auth: OtlpOutputAuth): string {
  return auth.type === otlpAuthType.AuthHeader ? OTLP_AUTHORIZATION_HEADER : auth.name;
}

/**
 * The header that the OTLP exporter sends to authenticate: the credential is a reference to a
 * secret, that Fleet Server replaces with its value. The credential is sent verbatim, Fleet does
 * not encode it.
 */
export function getOtlpAuthHeaders(
  auth: OtlpOutputAuth | null | undefined,
  credential: SOSecret | null | undefined
): Record<string, string> | undefined {
  if (!auth || typeof credential !== 'object' || !credential?.id) {
    return undefined;
  }
  const secretRef = toCompiledSecretRef(credential.id);
  const value =
    auth.type === otlpAuthType.AuthHeader
      ? `${OTLP_AUTH_SCHEME_PREFIX[auth.scheme]} ${secretRef}`
      : secretRef;

  return { [getOtlpAuthHeaderName(auth)]: value };
}

/**
 * Throws if the authentication of an OTLP output cannot be saved. The values are the ones the
 * output has once it is saved, i.e. the update merged with the saved output.
 */
export function validateOtlpAuth({
  auth,
  hasCredential,
  endpoint,
  headers,
}: {
  auth: OtlpOutputAuth | null | undefined;
  hasCredential: boolean;
  endpoint: string | undefined;
  headers: Record<string, string> | null | undefined;
}): void {
  if (!auth) {
    if (hasCredential) {
      throw new OutputInvalidError('secrets.auth.credential can only be set together with auth');
    }
    return;
  }

  // the managed OTLP endpoint is authenticated with an API key that Fleet Server creates
  if (endpoint && isManagedOtlpEndpoint(endpoint)) {
    throw new OutputInvalidError(
      'auth cannot be set for an output that sends data to the managed OTLP endpoint'
    );
  }

  if (!hasCredential) {
    throw new OutputInvalidError('secrets.auth.credential is required when auth is set');
  }

  const headerName = getOtlpAuthHeaderName(auth).toLowerCase();
  const conflictingHeader = Object.keys(headers ?? {}).find(
    (name) => name.toLowerCase() === headerName
  );
  if (conflictingHeader) {
    throw new OutputInvalidError(
      `otlp_exporter.headers cannot contain the "${conflictingHeader}" header, it is set by auth`
    );
  }
}

/**
 * A saved object update merges an object into the stored one key by key: the settings of the
 * stored authentication that the update leaves out are set to `null`, which removes them.
 */
export function withRemovedOtlpAuthSettings(
  auth: OtlpOutputAuth,
  storedAuth: OtlpOutputAuth | null | undefined
): OtlpOutputAuth {
  const removed = Object.keys(storedAuth ?? {}).filter((key) => !(key in auth));

  return removed.length
    ? ({ ...Object.fromEntries(removed.map((key) => [key, null])), ...auth } as OtlpOutputAuth)
    : auth;
}

/** Drops the settings of the authentication that an update removed, which are kept as `null`. */
export function omitRemovedOtlpAuthSettings(
  auth: OtlpOutputAuth | null | undefined
): OtlpOutputAuth | undefined {
  if (!auth) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(auth).filter(([, value]) => value !== null)
  ) as unknown as OtlpOutputAuth;
}
