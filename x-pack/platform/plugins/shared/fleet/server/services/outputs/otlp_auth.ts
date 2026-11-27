/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTLP_AUTH_SCHEME_PREFIX, otlpAuthType, otlpProtocol } from '../../../common/constants';
import {
  findOtlpAuthHeaderConflict,
  getOtlpAuthHeaderName,
  getOtlpExporterEndpoints,
  isValidOtlpAuthCredential,
  isValidOtlpGrpcMetadataKey,
  sendsToManagedOtlpHost,
} from '../../../common/services/otlp_auth';
import type { OtlpExporterConfig, OtlpOutputAuth, SOSecret } from '../../../common/types';
import { OutputInvalidError } from '../../errors';
import { toCompiledSecretRef } from '../secrets/common';
import { getManagedOtlpEndpoint } from '../utils/managed_otlp';

/** Whether the exporter sends data to the managed OTLP endpoint, for any of its signals. */
const sendsToManagedOtlpEndpoint = (exporter: Partial<OtlpExporterConfig> | null | undefined) =>
  sendsToManagedOtlpHost(getOtlpExporterEndpoints(exporter), getManagedOtlpEndpoint());

/**
 * The header that the OTLP exporter sends to authenticate: the credential is a reference to a
 * secret, that Fleet Server replaces with its value. The credential is sent verbatim, Fleet does
 * not encode it. There is none when the exporter sends data to the managed OTLP endpoint, which
 * Fleet authenticates itself.
 */
export function getOtlpAuthHeaders(
  auth: OtlpOutputAuth | null | undefined,
  credential: SOSecret | null | undefined,
  exporter: Partial<OtlpExporterConfig>
): Record<string, string> | undefined {
  if (!auth || typeof credential !== 'object' || !credential?.id) {
    return undefined;
  }
  if (sendsToManagedOtlpEndpoint(exporter)) {
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
 * Returns the secrets with the credential trimmed: a pasted value often ends with a line break,
 * which would make the header invalid.
 */
export function withTrimmedOtlpAuthCredential<T extends { secrets?: unknown }>(output: T): T {
  const secrets = output.secrets as { auth?: { credential?: unknown } } | null | undefined;
  const credential = secrets?.auth?.credential;
  if (typeof credential !== 'string' || credential === credential.trim()) {
    return output;
  }

  return {
    ...output,
    secrets: { ...secrets, auth: { ...secrets!.auth, credential: credential.trim() } },
  };
}

/**
 * Throws if the credential that an output sends is not one it can save: a new value, or the
 * reference to the secret the output already has. A reference to any other secret is rejected, as
 * the value of that secret would be sent to the endpoint of the output.
 */
export function validateOtlpAuthCredential(
  credential: SOSecret | null | undefined,
  storedCredential?: SOSecret | null
): void {
  if (typeof credential === 'string') {
    if (!isValidOtlpAuthCredential(credential)) {
      throw new OutputInvalidError('secrets.auth.credential cannot contain control characters');
    }
    return;
  }
  if (!credential) {
    return;
  }
  const storedId = typeof storedCredential === 'object' ? storedCredential?.id : undefined;
  if (!storedId || credential.id !== storedId) {
    throw new OutputInvalidError(
      'secrets.auth.credential must be a new value, or the reference to the credential of this output'
    );
  }
}

/**
 * Throws if the authentication of an OTLP output cannot be saved. The values are the ones the
 * output has once it is saved, i.e. the update merged with the saved output.
 */
export function validateOtlpAuth({
  auth,
  hasCredential,
  exporter,
}: {
  auth: OtlpOutputAuth | null | undefined;
  hasCredential: boolean;
  exporter: Partial<OtlpExporterConfig> | null | undefined;
}): void {
  if (!auth) {
    if (hasCredential) {
      throw new OutputInvalidError('secrets.auth.credential can only be set together with auth');
    }
    return;
  }

  // the managed OTLP endpoint is authenticated with an API key that Fleet Server creates
  if (sendsToManagedOtlpEndpoint(exporter)) {
    throw new OutputInvalidError(
      'auth cannot be set for an output that sends data to the managed OTLP endpoint'
    );
  }

  if (!hasCredential) {
    throw new OutputInvalidError('secrets.auth.credential is required when auth is set');
  }

  if (
    auth.type === otlpAuthType.CustomHeader &&
    exporter?.protocol === otlpProtocol.Grpc &&
    !isValidOtlpGrpcMetadataKey(auth.name)
  ) {
    throw new OutputInvalidError(
      `auth.name "${auth.name}" cannot be sent as gRPC metadata, it can only contain letters, digits, "-", "_" and "."`
    );
  }

  const conflictingHeader = findOtlpAuthHeaderConflict(
    Object.keys(exporter?.headers ?? {}),
    getOtlpAuthHeaderName(auth)
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
