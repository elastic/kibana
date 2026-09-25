/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync } from 'fs';
import type { SandboxSslConfig } from './config';

// Where the Kibana controller mounts the Cloud-issued client certificate in serverless.
export const DEFAULT_CERTIFICATE_PATH = '/mnt/elastic-internal/http-certs/tls.crt';
export const DEFAULT_KEY_PATH = '/mnt/elastic-internal/http-certs/tls.key';

export interface SandboxTlsCredentials {
  readonly rootCertPem?: Buffer;
  readonly clientCertPem?: Buffer;
  readonly clientKeyPem?: Buffer;
}

const readPemFile = (setting: keyof SandboxSslConfig, path: string): Buffer => {
  try {
    return readFileSync(path);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read xpack.sandbox.ssl.${setting} from "${path}": ${reason}`);
  }
};

/**
 * Reads the PEM files referenced by `xpack.sandbox.ssl`. Configured paths must be readable; with
 * neither `certificate` nor `key` configured, the serverless mount is used if present and no
 * client certificate otherwise.
 */
export const readTlsCredentials = ({
  certificate_authorities: certificateAuthorities,
  certificate,
  key,
}: SandboxSslConfig): SandboxTlsCredentials => {
  const rootCertPem = certificateAuthorities
    ? readPemFile('certificate_authorities', certificateAuthorities)
    : undefined;

  const hasDefaultMount = existsSync(DEFAULT_CERTIFICATE_PATH) && existsSync(DEFAULT_KEY_PATH);
  if (!certificate && !key && !hasDefaultMount) {
    return { rootCertPem };
  }

  return {
    rootCertPem,
    clientCertPem: readPemFile('certificate', certificate ?? DEFAULT_CERTIFICATE_PATH),
    clientKeyPem: readPemFile('key', key ?? DEFAULT_KEY_PATH),
  };
};
