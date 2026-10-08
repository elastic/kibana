/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { connectorsHash, edotEnvHash, isEdotStale, isScoutStale, scoutEnvHash } from './services';

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

  it('keeps the hash of stacks started without scoutHook output', () => {
    expect(scoutEnvHash({ ...base })).toBe(scoutEnvHash(base));
    expect(scoutEnvHash(undefined)).toBe(scoutEnvHash({}));
  });

  it('changes when a scoutHook variable is added or changed', () => {
    const withHook = scoutEnvHash({ ...base, SUITE_KEY: 'a' });
    expect(withHook).not.toBe(scoutEnvHash(base));
    expect(scoutEnvHash({ ...base, SUITE_KEY: 'b' })).not.toBe(withHook);
  });

  it('ignores the order scoutHook variables were provided in', () => {
    expect(scoutEnvHash({ ...base, B: 'k', A: 'h' })).toBe(
      scoutEnvHash({ ...base, A: 'h', B: 'k' })
    );
  });
});

describe('isScoutStale', () => {
  let repoRoot: string;
  const serverless = { arch: 'serverless', domain: 'observability_complete' } as const;

  beforeEach(() => {
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-services-'));
  });

  afterEach(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  const writeScoutState = (entry: Record<string, unknown>) => {
    const dir = Path.join(repoRoot, 'target/evals');
    Fs.mkdirSync(dir, { recursive: true });
    Fs.writeFileSync(
      Path.join(dir, 'services.json'),
      JSON.stringify({
        scout: {
          pid: process.pid,
          logFile: 'target/evals/scout.log',
          startedAt: new Date().toISOString(),
          connectorsHash: connectorsHash(),
          envHash: scoutEnvHash({}),
          ...entry,
        },
      })
    );
  };

  it('treats a Scout started before arch/domain were recorded as stateful/classic', () => {
    writeScoutState({});

    expect(isScoutStale(repoRoot, undefined, {})).toEqual({ stale: false });
    expect(isScoutStale(repoRoot, undefined, {}, serverless)).toEqual({
      stale: true,
      reason:
        'Scout arch/domain changed (running: stateful/classic, requested: serverless/observability_complete)',
    });
  });

  it('reuses a Scout already running on the requested arch/domain', () => {
    writeScoutState({ scoutArch: 'serverless', scoutDomain: 'observability_complete' });

    expect(isScoutStale(repoRoot, undefined, {}, serverless)).toEqual({ stale: false });
  });

  it('restarts a serverless Scout when stateful is requested', () => {
    writeScoutState({ scoutArch: 'serverless', scoutDomain: 'observability_complete' });

    expect(isScoutStale(repoRoot, undefined, {}).stale).toBe(true);
  });
});
