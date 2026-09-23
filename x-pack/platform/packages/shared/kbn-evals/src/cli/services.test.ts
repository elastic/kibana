/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { edotEnvHash, isEdotStale, scoutEnvHash } from './services';

const LOCAL_ES = 'http://elastic:changeme@localhost:9200';
const CLOUD_ES = 'https://kbn-evals-serverless.es.us-central1.gcp.elastic.cloud';
const DEAD_PID = 2 ** 30;

describe('isEdotStale', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-services-'));
  });

  afterEach(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  const writeEdotState = (entry: Record<string, unknown>) => {
    const dir = Path.join(repoRoot, 'target/evals');
    Fs.mkdirSync(dir, { recursive: true });
    Fs.writeFileSync(
      Path.join(dir, 'services.json'),
      JSON.stringify({
        edot: {
          pid: process.pid,
          logFile: 'target/evals/edot.log',
          startedAt: new Date().toISOString(),
          ...entry,
        },
      })
    );
  };

  it('restarts a collector that exports to another Elasticsearch', () => {
    writeEdotState({ envHash: edotEnvHash(CLOUD_ES) });

    expect(isEdotStale(repoRoot, LOCAL_ES)).toEqual({
      stale: true,
      reason: 'TRACING_ES_URL changed',
    });
  });

  it('restarts a collector started before any target was configured', () => {
    writeEdotState({ envHash: edotEnvHash(undefined) });

    expect(isEdotStale(repoRoot, LOCAL_ES).stale).toBe(true);
  });

  it('reuses a collector already exporting where this run reads', () => {
    writeEdotState({ envHash: edotEnvHash(LOCAL_ES) });

    expect(isEdotStale(repoRoot, LOCAL_ES)).toEqual({ stale: false });
  });

  it('reuses a collector whose target was never recorded', () => {
    writeEdotState({});

    expect(isEdotStale(repoRoot, LOCAL_ES)).toEqual({ stale: false });
  });

  it('leaves a collector that is no longer running to the start that follows', () => {
    writeEdotState({ pid: DEAD_PID, envHash: edotEnvHash(CLOUD_ES) });

    expect(isEdotStale(repoRoot, LOCAL_ES)).toEqual({ stale: false });
  });

  it('says nothing when no collector was ever started', () => {
    expect(isEdotStale(repoRoot, LOCAL_ES)).toEqual({ stale: false });
  });
});

describe('scoutEnvHash', () => {
  const base = { TRACING_EXPORTERS: '[]', GCS_CREDENTIALS: '{}' };

  it('keeps the hash of stacks started without sandbox settings', () => {
    expect(scoutEnvHash({ ...base, UNRELATED: 'x' })).toBe(scoutEnvHash(base));
  });

  it('changes when a sandbox setting is added or changed', () => {
    const withSandbox = scoutEnvHash({ ...base, SANDBOX_API_HOST: 'a' });
    expect(withSandbox).not.toBe(scoutEnvHash(base));
    expect(scoutEnvHash({ ...base, SANDBOX_API_HOST: 'b' })).not.toBe(withSandbox);
  });

  it('changes when a PEM file referenced by a *_PATH setting is replaced in place', () => {
    const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-pem-'));
    const certPath = Path.join(dir, 'tls.crt');
    try {
      Fs.writeFileSync(certPath, 'old');
      const before = scoutEnvHash({ ...base, SANDBOX_CLIENT_CERT_PATH: certPath });
      Fs.writeFileSync(certPath, 'renewed');
      expect(scoutEnvHash({ ...base, SANDBOX_CLIENT_CERT_PATH: certPath })).not.toBe(before);
    } finally {
      Fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('ignores the order sandbox settings were provided in', () => {
    expect(scoutEnvHash({ ...base, SANDBOX_API_KEY: 'k', SANDBOX_API_HOST: 'h' })).toBe(
      scoutEnvHash({ ...base, SANDBOX_API_HOST: 'h', SANDBOX_API_KEY: 'k' })
    );
  });
});
