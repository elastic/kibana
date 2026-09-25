/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import type { SandboxSslConfig } from './config';

export interface SandboxTlsCredentials {
  readonly rootCertPem?: Buffer;
  readonly clientCertPem: Buffer;
  readonly clientKeyPem: Buffer;
}

const readPemFile = (setting: keyof SandboxSslConfig, path: string): Buffer => {
  try {
    return readFileSync(path);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read xpack.sandbox.ssl.${setting} from "${path}": ${reason}`);
  }
};

/** Reads the mTLS PEM files referenced by `xpack.sandbox.ssl`, throwing if any is unreadable. */
export const readTlsCredentials = ({
  certificate_authorities: certificateAuthorities,
  certificate,
  key,
}: SandboxSslConfig): SandboxTlsCredentials => ({
  rootCertPem: certificateAuthorities
    ? readPemFile('certificate_authorities', certificateAuthorities)
    : undefined,
  clientCertPem: readPemFile('certificate', certificate),
  clientKeyPem: readPemFile('key', key),
});
