/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OTLP_AUTH_SCHEME_PREFIX,
  otlpAuthType,
  otlpAzureAuthMethod,
  otlpProtocol,
} from '../../../common/constants';
import {
  findOtlpAuthHeaderConflict,
  getOtlpAuthHeaderName,
  getOtlpAuthSecretKey,
  getOtlpExporterEndpoints,
  isValidOtlpAuthCredential,
  isValidOtlpGrpcMetadataKey,
  OTLP_AUTH_SECRET_KEYS,
  sendsToManagedOtlpHost,
} from '../../../common/services/otlp_auth';
import type { OtlpAuthSecretKey } from '../../../common/services/otlp_auth';
import type {
  OtlpAzureAuth,
  OtlpExporterConfig,
  OtlpOutputAuth,
  SOSecret,
} from '../../../common/types';
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
  if (
    !auth ||
    auth.type === otlpAuthType.Azure ||
    typeof credential !== 'object' ||
    !credential?.id
  ) {
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
 * The Azure authentication extension of the exporter: the collector requests a Microsoft Entra ID
 * token with it, and sends it in the `Authorization` header. The client secret of a service
 * principal is a reference to a secret, that Fleet Server replaces with its value. There is none
 * when the exporter sends data to the managed OTLP endpoint, which Fleet authenticates itself.
 */
export function getOtlpAzureAuthExtension(
  auth: OtlpOutputAuth | null | undefined,
  clientSecret: SOSecret | null | undefined,
  exporter: Partial<OtlpExporterConfig>
): Record<string, unknown> | undefined {
  if (auth?.type !== otlpAuthType.Azure || sendsToManagedOtlpEndpoint(exporter)) {
    return undefined;
  }

  const scopes = auth.scopes?.length ? { scopes: auth.scopes } : {};
  if (auth.azure_auth_method === otlpAzureAuthMethod.ManagedIdentity) {
    // without a client id, the system-assigned identity is used
    return {
      managed_identity: auth.client_id ? { client_id: auth.client_id } : {},
      ...scopes,
    };
  }

  if (typeof clientSecret !== 'object' || !clientSecret?.id) {
    return undefined;
  }

  return {
    service_principal: {
      tenant_id: auth.tenant_id,
      client_id: auth.client_id,
      client_secret: toCompiledSecretRef(clientSecret.id),
    },
    ...scopes,
  };
}

/**
 * Returns the secrets with the credentials trimmed: a pasted value often ends with a line break,
 * which would make the header, or the token request, invalid.
 */
export function withTrimmedOtlpAuthCredential<T extends { secrets?: unknown }>(output: T): T {
  const secrets = output.secrets as { auth?: Record<string, unknown> } | null | undefined;
  const trimmed = OTLP_AUTH_SECRET_KEYS.filter((key) => {
    const value = secrets?.auth?.[key];
    return typeof value === 'string' && value !== value.trim();
  });
  if (!trimmed.length) {
    return output;
  }

  const auth = { ...secrets!.auth };
  trimmed.forEach((key) => {
    auth[key] = (auth[key] as string).trim();
  });

  return { ...output, secrets: { ...secrets, auth } };
}

/**
 * Throws if a credential that an output sends is not one it can save: a new value, or the
 * reference to the secret the output already has. A reference to any other secret is rejected, as
 * the value of that secret would be sent to the endpoint of the output, or to Microsoft Entra ID.
 */
export function validateOtlpAuthCredential(
  credential: SOSecret | null | undefined,
  storedCredential?: SOSecret | null,
  key: OtlpAuthSecretKey = 'credential'
): void {
  const path = `secrets.auth.${key}`;
  if (typeof credential === 'string') {
    if (!isValidOtlpAuthCredential(credential)) {
      throw new OutputInvalidError(`${path} cannot contain control characters`);
    }
    return;
  }
  if (!credential) {
    return;
  }
  const storedId = typeof storedCredential === 'object' ? storedCredential?.id : undefined;
  if (!storedId || credential.id !== storedId) {
    throw new OutputInvalidError(
      `${path} must be a new value, or the reference to the ${
        key === 'credential' ? 'credential' : 'client secret'
      } of this output`
    );
  }
}

/** Throws if the secrets of the authentication of an output are not ones it can save. */
export function validateOtlpAuthSecrets(
  secrets: { auth?: { [key in OtlpAuthSecretKey]?: SOSecret | null } | null } | null | undefined,
  storedSecrets?: { auth?: { [key in OtlpAuthSecretKey]?: SOSecret | null } | null } | null
): void {
  OTLP_AUTH_SECRET_KEYS.forEach((key) =>
    validateOtlpAuthCredential(secrets?.auth?.[key], storedSecrets?.auth?.[key], key)
  );
}

/** The settings of the HTTP exporter that hold a URL it sends data to. */
const OTLP_HTTP_ENDPOINT_FIELDS = [
  'endpoint',
  'traces_endpoint',
  'metrics_endpoint',
  'logs_endpoint',
  'profiles_endpoint',
] as const;

/** Throws if the Azure authentication of an output is not complete for its method. */
function validateOtlpAzureAuth(
  auth: OtlpAzureAuth,
  exporter: Partial<OtlpExporterConfig> | null | undefined
): void {
  // the extension only authenticates HTTP requests, it cannot add the token to gRPC calls
  if (exporter?.protocol !== otlpProtocol.HttpProtobuf) {
    throw new OutputInvalidError(
      `auth.type "${otlpAuthType.Azure}" requires otlp_exporter.protocol "${otlpProtocol.HttpProtobuf}"`
    );
  }

  // the token is a bearer token: it is only sent to an endpoint that proves its identity. The
  // error names the setting, not its value: a URL can carry credentials.
  const insecureEndpointField = OTLP_HTTP_ENDPOINT_FIELDS.find((field) => {
    const endpoint = exporter[field as keyof typeof exporter];
    return typeof endpoint === 'string' && !/^https:\/\//i.test(endpoint);
  });
  if (insecureEndpointField) {
    throw new OutputInvalidError(
      `auth.type "${otlpAuthType.Azure}" requires https endpoints, otlp_exporter.${insecureEndpointField} is not one`
    );
  }
  if (exporter.tls?.insecure_skip_verify) {
    throw new OutputInvalidError(
      `auth.type "${otlpAuthType.Azure}" cannot be set together with otlp_exporter.tls.insecure_skip_verify`
    );
  }

  if (auth.azure_auth_method === otlpAzureAuthMethod.ServicePrincipal) {
    const missing = (['tenant_id', 'client_id'] as const).filter((key) => !auth[key]);
    if (missing.length) {
      throw new OutputInvalidError(
        `auth.${missing.join(' and auth.')} ${missing.length > 1 ? 'are' : 'is'} required for the ${
          otlpAzureAuthMethod.ServicePrincipal
        } method`
      );
    }
  } else if (auth.tenant_id) {
    throw new OutputInvalidError(
      `auth.tenant_id can only be set for the ${otlpAzureAuthMethod.ServicePrincipal} method`
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
  hasAzureClientSecret = false,
  exporter,
}: {
  auth: OtlpOutputAuth | null | undefined;
  hasCredential: boolean;
  hasAzureClientSecret?: boolean;
  exporter: Partial<OtlpExporterConfig> | null | undefined;
}): void {
  if (!auth) {
    if (hasCredential) {
      throw new OutputInvalidError('secrets.auth.credential can only be set together with auth');
    }
    if (hasAzureClientSecret) {
      throw new OutputInvalidError(
        'secrets.auth.azure_client_secret can only be set together with auth'
      );
    }
    return;
  }

  // the managed OTLP endpoint is authenticated with an API key that Fleet Server creates
  if (sendsToManagedOtlpEndpoint(exporter)) {
    throw new OutputInvalidError(
      'auth cannot be set for an output that sends data to the managed OTLP endpoint'
    );
  }

  if (auth.type === otlpAuthType.Azure) {
    validateOtlpAzureAuth(auth, exporter);
  }

  const secretKey = getOtlpAuthSecretKey(auth);
  if (hasCredential && secretKey !== 'credential') {
    throw new OutputInvalidError(
      `secrets.auth.credential cannot be set for auth.type "${auth.type}"`
    );
  }
  if (hasAzureClientSecret && secretKey !== 'azure_client_secret') {
    throw new OutputInvalidError(
      `secrets.auth.azure_client_secret can only be set for the ${otlpAzureAuthMethod.ServicePrincipal} method of auth.type "${otlpAuthType.Azure}"`
    );
  }
  if (secretKey === 'credential' && !hasCredential) {
    throw new OutputInvalidError('secrets.auth.credential is required when auth is set');
  }
  if (secretKey === 'azure_client_secret' && !hasAzureClientSecret) {
    throw new OutputInvalidError(
      `secrets.auth.azure_client_secret is required for the ${otlpAzureAuthMethod.ServicePrincipal} method`
    );
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
