/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { envFromDatasetsProfile, envFromExportProfile, VAULT_CONFIG_DIR } from './profiles';

const CERT = '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----\n';
const KEY = '-----BEGIN PRIVATE KEY-----\ndef\n-----END PRIVATE KEY-----\n';
const CA = '-----BEGIN CERTIFICATE-----\nghi\n-----END CERTIFICATE-----\n';

describe('sandbox profile env', () => {
  let repoRoot: string;

  const writeProfile = (config: Record<string, unknown>) => {
    const dir = Path.join(repoRoot, VAULT_CONFIG_DIR);
    Fs.mkdirSync(dir, { recursive: true });
    Fs.writeFileSync(Path.join(dir, 'config.test.json'), JSON.stringify(config));
  };

  beforeEach(() => {
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-profiles-'));
  });

  afterEach(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it('maps the sandbox block to SANDBOX_* env vars for both profile kinds', () => {
    writeProfile({
      sandbox: {
        host: 'sandbox.example.com',
        port: 443,
        apiKey: 'secret',
        ssl: { certificate: CERT, key: KEY, certificateAuthorities: CA },
      },
    });
    const expected = {
      SANDBOX_API_HOST: 'sandbox.example.com',
      SANDBOX_API_PORT: '443',
      SANDBOX_API_KEY: 'secret',
      SANDBOX_CLIENT_CERT: CERT,
      SANDBOX_CLIENT_KEY: KEY,
      SANDBOX_CA_CERT: CA,
    };

    expect(envFromDatasetsProfile(repoRoot, 'test')).toMatchObject(expected);
    expect(envFromExportProfile(repoRoot, 'test')).toMatchObject(expected);
  });

  it('skips placeholders and missing sandbox fields', () => {
    writeProfile({
      sandbox: { host: 'REPLACE_ME', port: 9090, apiKey: 'REPLACE_ME', ssl: { certificate: CERT } },
    });

    const env = envFromExportProfile(repoRoot, 'test');
    expect(env).toEqual({ SANDBOX_API_PORT: '9090', SANDBOX_CLIENT_CERT: CERT });
  });

  it('adds nothing when the profile has no sandbox block', () => {
    writeProfile({});

    expect(Object.keys(envFromExportProfile(repoRoot, 'test'))).toEqual([]);
  });
});
