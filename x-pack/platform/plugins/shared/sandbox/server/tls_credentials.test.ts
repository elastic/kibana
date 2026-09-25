/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import Path from 'path';
import { config, DEFAULT_CERTIFICATE_PATH, DEFAULT_KEY_PATH } from './config';
import { readTlsCredentials } from './tls_credentials';

describe('readTlsCredentials', () => {
  let directory: string;
  let certificate: string;
  let key: string;
  let certificateAuthorities: string;

  beforeEach(() => {
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

  it('throws naming the setting and path when a file cannot be read', () => {
    const missing = Path.join(directory, 'missing.key');
    expect(() => readTlsCredentials({ certificate, key: missing })).toThrow(
      `Unable to read xpack.sandbox.ssl.key from "${missing}"`
    );
    expect(() =>
      readTlsCredentials({ certificate, key, certificate_authorities: missing })
    ).toThrow('xpack.sandbox.ssl.certificate_authorities');
  });
});

describe('sandbox ssl config', () => {
  it('defaults the client certificate and key to the serverless mount', () => {
    expect(config.schema.validate({ enabled: true }).ssl).toEqual({
      certificate: DEFAULT_CERTIFICATE_PATH,
      key: DEFAULT_KEY_PATH,
    });
  });

  it('uses configured paths over the defaults', () => {
    expect(
      config.schema.validate({ ssl: { certificate: '/certs/tls.crt', key: '/certs/tls.key' } }).ssl
    ).toEqual({ certificate: '/certs/tls.crt', key: '/certs/tls.key' });
  });
});
