/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTLP_AUTHORIZATION_HEADER, otlpAuthType, otlpProtocol } from '../constants/output';
import type { OtlpExporterConfig, OtlpOutputAuth } from '../types/models/output';

// RFC 9110 field name (token): the header is sent as an HTTP header or as gRPC metadata
const OTLP_HEADER_NAME_REGEX = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export const OTLP_HEADER_NAME_MAX_LENGTH = 256;

/** Whether a name can be the name of a header of the OTLP exporter. */
export const isValidOtlpHeaderName = (name: string): boolean =>
  name.length <= OTLP_HEADER_NAME_MAX_LENGTH && OTLP_HEADER_NAME_REGEX.test(name);

// gRPC metadata keys only have letters, digits, `-`, `_` and `.`: the letters are sent in lower
// case, `-bin` keys carry binary values and `grpc-` keys are reserved
const OTLP_GRPC_METADATA_KEY_REGEX = /^[0-9a-z_.-]+$/i;

/** Whether a name can be the name of a header that the gRPC exporter sends as metadata. */
export const isValidOtlpGrpcMetadataKey = (name: string): boolean => {
  const key = name.toLowerCase();
  return (
    isValidOtlpHeaderName(name) &&
    OTLP_GRPC_METADATA_KEY_REGEX.test(name) &&
    !key.endsWith('-bin') &&
    !key.startsWith('grpc-')
  );
};

/** The credential is sent in a single header, which servers limit to a few kilobytes. */
export const OTLP_AUTH_CREDENTIAL_MAX_LENGTH = 8192;

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

/**
 * The URLs the OTLP exporter sends data to: the endpoint, and for HTTP the endpoints of the
 * signals, which replace it for that signal.
 */
export const getOtlpExporterEndpoints = (
  exporter: Partial<OtlpExporterConfig> | null | undefined
): string[] => {
  if (!exporter) {
    return [];
  }
  const endpoints: Array<string | null | undefined> = [exporter.endpoint];
  if (exporter.protocol === otlpProtocol.HttpProtobuf) {
    endpoints.push(
      exporter.traces_endpoint,
      exporter.metrics_endpoint,
      exporter.logs_endpoint,
      exporter.profiles_endpoint
    );
  }
  return endpoints.filter((endpoint): endpoint is string => !!endpoint);
};

const getHostname = (url: string): string | undefined => {
  try {
    return new URL(url.includes('://') ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return undefined;
  }
};

/**
 * Whether the exporter sends data to the host of the managed OTLP endpoint, for any signal. The
 * host is compared, not the path: the endpoints of the signals have their own paths.
 */
export const sendsToManagedOtlpHost = (
  endpoints: string[],
  managedOtlpUrl: string | undefined
): boolean => {
  const managedHost = managedOtlpUrl ? getHostname(managedOtlpUrl) : undefined;
  return (
    !!managedHost &&
    endpoints.some((endpoint) => !!endpoint.trim() && getHostname(endpoint.trim()) === managedHost)
  );
};
