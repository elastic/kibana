/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

vi.mock('@elastic/elasticsearch', () => {
      const mocked = {
      Client: vi.fn().mockImplementation(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/dev-cli-runner', () => {
      const mocked = {
      run: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../src/restore', () => {
      const mocked = {
      restoreSnapshot: vi.fn().mockResolvedValue({
        success: true,
        snapshotName: 'snapshot',
        restoredIndices: [],
        errors: [],
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../src/replay', () => {
      const mocked = {
      replaySnapshot: vi.fn().mockResolvedValue({
        success: true,
        snapshotName: 'snapshot',
        restoredIndices: [],
        reindexedIndices: [],
        maxTimestamp: '2024-01-15T12:00:00.000Z',
        errors: [],
      }),
    };
      return { ...mocked, default: mocked };
    });

import { run } from '@kbn/dev-cli-runner';
import type { RunContext } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { restoreSnapshot } from '../src/restore';
import { replaySnapshot } from '../src/replay';
import { runCli } from './cli';

const mockClient = (await vi.importMock('@elastic/elasticsearch')).Client as Mock;
const mockRun = run as MockedFunction<typeof run>;
const mockRestoreSnapshot = restoreSnapshot as MockedFunction<typeof restoreSnapshot>;
const mockReplaySnapshot = replaySnapshot as MockedFunction<typeof replaySnapshot>;

const createLog = (): ToolingLog =>
  ({
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  } as unknown as ToolingLog);

const createRunContext = (flags: Record<string, unknown>): RunContext =>
  ({
    log: createLog(),
    flags: {
      verbose: false,
      quiet: false,
      silent: false,
      debug: false,
      help: false,
      _: ['restore'],
      unexpected: [],
      ...flags,
    },
  } as unknown as RunContext);

describe('runCli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getRestoreHandler = () => {
    process.argv = ['node', 'scripts/es_snapshot_loader', 'restore'];
    runCli();
    return mockRun.mock.calls[0][0];
  };

  const getReplayHandler = () => {
    process.argv = ['node', 'scripts/es_snapshot_loader', 'replay'];
    runCli();
    return mockRun.mock.calls[0][0];
  };

  it('uses API key auth when --es-api-key is provided', async () => {
    const restoreHandler = getRestoreHandler();

    await restoreHandler(
      createRunContext({
        'es-url': 'https://elastic:changeme@example.com:9200',
        'es-api-key': 'base64-api-key',
        'snapshot-url': 'file:///tmp/snapshots',
      })
    );

    expect(mockClient).toHaveBeenCalledWith({
      node: 'https://example.com:9200/',
      auth: { apiKey: 'base64-api-key' },
    });
  });

  it('throws when --es-api-key is provided without --es-url', async () => {
    const restoreHandler = getRestoreHandler();

    await expect(
      restoreHandler(
        createRunContext({
          'es-api-key': 'base64-api-key',
          'kibana-url': 'http://localhost:5601',
          'snapshot-url': 'file:///tmp/snapshots',
        })
      )
    ).rejects.toThrow(
      '--es-api-key requires --es-url. API key auth is not supported when connecting through Kibana (--kibana-url).'
    );
  });

  it('falls back to basic auth from URL credentials when API key is omitted', async () => {
    const restoreHandler = getRestoreHandler();

    await restoreHandler(
      createRunContext({
        'es-url': 'https://elastic:changeme@example.com:9200',
        'snapshot-url': 'file:///tmp/snapshots',
      })
    );

    expect(mockClient).toHaveBeenCalledWith({
      node: 'https://example.com:9200/',
      auth: { username: 'elastic', password: 'changeme' },
    });
  });

  it('parses restore index settings into numbers, booleans, and strings', async () => {
    const restoreHandler = getRestoreHandler();

    await restoreHandler(
      createRunContext({
        'es-url': 'https://example.com:9200',
        'snapshot-url': 'file:///tmp/snapshots',
        'index-settings': 'a=1,b=true,c=x,d=value=with=equals',
      })
    );

    expect(mockRestoreSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        indexSettings: { a: 1, b: true, c: 'x', d: 'value=with=equals' },
      })
    );
  });

  it('parses replay index settings into numbers, booleans, and strings', async () => {
    const replayHandler = getReplayHandler();

    await replayHandler(
      createRunContext({
        'es-url': 'https://example.com:9200',
        'snapshot-url': 'file:///tmp/snapshots',
        patterns: 'logs-*',
        'index-settings': 'a=1,b=true,c=x,d=value=with=equals',
      })
    );

    expect(mockReplaySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        indexSettings: { a: 1, b: true, c: 'x', d: 'value=with=equals' },
      })
    );
  });

  it('rejects malformed index settings', async () => {
    const restoreHandler = getRestoreHandler();

    await expect(
      restoreHandler(
        createRunContext({
          'es-url': 'https://example.com:9200',
          'snapshot-url': 'file:///tmp/snapshots',
          'index-settings': 'valid=1,missing-value',
        })
      )
    ).rejects.toThrow('--index-settings entries must use key=value: missing-value');
  });
});
