/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { execFileSync } from 'child_process';
import { SERVERLESS_SECRETS_DIR } from '@kbn/es';
import { ToolingLog } from '@kbn/tooling-log';
import {
  connectorsHash,
  edotEnvHash,
  isEdotStale,
  isScoutStale,
  scoutEnvHash,
  stopService,
} from './services';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFileSync: jest.fn(),
}));

const execFileSyncMock = execFileSync as jest.MockedFunction<typeof execFileSync>;

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

describe('stopService (scout)', () => {
  const log = new ToolingLog();
  let repoRoot: string;
  let rmSyncSpy: jest.SpyInstance;

  beforeEach(() => {
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-services-'));
    const realRmSync = Fs.rmSync;
    rmSyncSpy = jest
      .spyOn(Fs, 'rmSync')
      .mockImplementation((path, options) =>
        path === SERVERLESS_SECRETS_DIR ? undefined : realRmSync(path, options)
      );
  });

  afterEach(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
    rmSyncSpy.mockRestore();
    execFileSyncMock.mockReset();
  });

  const writeScoutState = (entry: Record<string, unknown>) => {
    const dir = Path.join(repoRoot, 'target/evals');
    Fs.mkdirSync(dir, { recursive: true });
    Fs.writeFileSync(
      Path.join(dir, 'services.json'),
      JSON.stringify({
        scout: {
          pid: DEAD_PID,
          logFile: 'target/evals/scout.log',
          startedAt: new Date().toISOString(),
          ...entry,
        },
      })
    );
  };

  const SERVERLESS_IMAGE = 'docker.elastic.co/kibana-ci/elasticsearch-serverless:latest-verified';
  const STATEFUL_IMAGE = 'docker.elastic.co/elasticsearch/elasticsearch:9.3.0-SNAPSHOT';
  const UIAM_IMAGE = 'docker.elastic.co/kibana-ci/uiam:latest-verified';

  const mockDocker = ({
    containers,
    psFails = false,
    rmFails = false,
  }: {
    containers: Array<[name: string, image: string]>;
    psFails?: boolean;
    rmFails?: boolean;
  }) => {
    execFileSyncMock.mockImplementation((_command, args) => {
      if (args?.[0] === 'ps') {
        if (psFails) throw new Error('Cannot connect to the Docker daemon');
        return containers.map((container) => container.join('\t')).join('\n') + '\n';
      }
      if (args?.[0] === 'rm' && rmFails) throw new Error('Cannot connect to the Docker daemon');
      return '';
    });
  };

  const dockerRmCalls = () => execFileSyncMock.mock.calls.filter(([, args]) => args?.[0] === 'rm');

  const secretsRemoved = () =>
    rmSyncSpy.mock.calls.some(([path]) => path === SERVERLESS_SECRETS_DIR);

  it('removes the serverless containers and secrets left by a serverless Scout', async () => {
    writeScoutState({ scoutArch: 'serverless', scoutDomain: 'observability_complete' });
    mockDocker({
      containers: [
        ['es01', SERVERLESS_IMAGE],
        ['es02', SERVERLESS_IMAGE],
        ['uiam-cosmosdb', 'docker.elastic.co/kibana-ci/uiam-azure-cosmos-emulator:latest-verified'],
        ['uiam', UIAM_IMAGE],
      ],
    });

    await stopService(repoRoot, 'scout', log);

    expect(dockerRmCalls()).toEqual([
      ['docker', ['rm', '--force', 'es01', 'es02', 'uiam-cosmosdb', 'uiam'], expect.anything()],
    ]);
    expect(secretsRemoved()).toBe(true);
  });

  it('removes serverless containers orphaned after Scout is no longer tracked', async () => {
    mockDocker({
      containers: [
        ['es01', SERVERLESS_IMAGE],
        ['uiam', UIAM_IMAGE],
      ],
    });

    await stopService(repoRoot, 'scout', log);

    expect(dockerRmCalls()).toEqual([
      ['docker', ['rm', '--force', 'es01', 'uiam'], expect.anything()],
    ]);
  });

  it('leaves a stateful es01 started by `es docker` alone', async () => {
    mockDocker({ containers: [['es01', STATEFUL_IMAGE]] });

    await stopService(repoRoot, 'scout', log);

    expect(dockerRmCalls()).toEqual([]);
  });

  it('leaves serverless containers alone when the tracked Scout is stateful', async () => {
    writeScoutState({ scoutArch: 'stateful', scoutDomain: 'classic' });
    mockDocker({ containers: [['es01', SERVERLESS_IMAGE]] });

    await stopService(repoRoot, 'scout', log);

    expect(execFileSyncMock).not.toHaveBeenCalled();
    expect(secretsRemoved()).toBe(false);
  });

  it('keeps the secrets while the containers could not be listed', async () => {
    writeScoutState({ scoutArch: 'serverless', scoutDomain: 'observability_complete' });
    mockDocker({ containers: [], psFails: true });

    await stopService(repoRoot, 'scout', log);

    expect(dockerRmCalls()).toEqual([]);
    expect(secretsRemoved()).toBe(false);
  });

  it('keeps the secrets while the containers could not be removed', async () => {
    writeScoutState({ scoutArch: 'serverless', scoutDomain: 'observability_complete' });
    mockDocker({ containers: [['es01', SERVERLESS_IMAGE]], rmFails: true });

    await stopService(repoRoot, 'scout', log);

    expect(secretsRemoved()).toBe(false);
  });
});
