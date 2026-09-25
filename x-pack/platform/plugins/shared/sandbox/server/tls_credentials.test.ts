/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import Path from 'path';
import { DEFAULT_CERTIFICATE_PATH, DEFAULT_KEY_PATH, readTlsCredentials } from './tls_credentials';

const mockDefaultMount = new Map<string, string>();

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: (path: string) => mockDefaultMount.has(path) || actual.existsSync(path),
    readFileSync: (path: string) => {
      const contents = mockDefaultMount.get(path);
      return contents === undefined ? actual.readFileSync(path) : Buffer.from(contents);
    },
  };
});

describe('readTlsCredentials', () => {
  let directory: string;
  let certificate: string;
  let key: string;
  let certificateAuthorities: string;

  beforeEach(() => {
    mockDefaultMount.clear();
    directory = mkdtempSync(Path.join(tmpdir(), 'sandbox-tls-'));
    certificate = Path.join(directory, 'tls.crt');
    key = Path.join(directory, 'tls.key');
    certificateAuthorities = Path.join(directory, 'ca.crt');
    writeFileSync(certificate, 'CERT');
    writeFileSync(key, 'KEY', { mode: 0o600 });
    writeFileSync(certificateAuthorities, 'CA');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('reads the certificate, key and optional CA from the configured paths', () => {
    expect(
      readTlsCredentials({ certificate, key, certificate_authorities: certificateAuthorities })
    ).toEqual({
      rootCertPem: Buffer.from('CA'),
      clientCertPem: Buffer.from('CERT'),
      clientKeyPem: Buffer.from('KEY'),
    });
  });

  it('leaves the CA unset when certificate_authorities is not configured', () => {
    expect(readTlsCredentials({ certificate, key }).rootCertPem).toBeUndefined();
  });

  it('uses the serverless mount when certificate and key are not configured', () => {
    mockDefaultMount.set(DEFAULT_CERTIFICATE_PATH, 'MOUNT_CERT');
    mockDefaultMount.set(DEFAULT_KEY_PATH, 'MOUNT_KEY');
    expect(readTlsCredentials({})).toEqual({
      rootCertPem: undefined,
      clientCertPem: Buffer.from('MOUNT_CERT'),
      clientKeyPem: Buffer.from('MOUNT_KEY'),
    });
  });

  it('skips the client certificate when nothing is configured and the mount is missing', () => {
    expect(readTlsCredentials({})).toEqual({ rootCertPem: undefined });
    mockDefaultMount.set(DEFAULT_CERTIFICATE_PATH, 'MOUNT_CERT');
    expect(readTlsCredentials({ certificate_authorities: certificateAuthorities })).toEqual({
      rootCertPem: Buffer.from('CA'),
    });
  });

  it('throws naming the setting and path when a configured file cannot be read', () => {
    const missing = Path.join(directory, 'missing.key');
    expect(() => readTlsCredentials({ certificate, key: missing })).toThrow(
      `Unable to read xpack.sandbox.ssl.key from "${missing}"`
    );
    expect(() =>
      readTlsCredentials({ certificate, key, certificate_authorities: missing })
    ).toThrow('xpack.sandbox.ssl.certificate_authorities');
  });

  it('requires the default key when only the certificate is configured', () => {
    expect(() => readTlsCredentials({ certificate })).toThrow(
      `Unable to read xpack.sandbox.ssl.key from "${DEFAULT_KEY_PATH}"`
    );
  });
});
