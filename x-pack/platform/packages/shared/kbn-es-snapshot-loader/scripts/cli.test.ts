/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

jest.mock('../src/restore', () => ({
  restoreSnapshot: jest.fn().mockResolvedValue({
    success: true,
    snapshotName: 'snapshot',
    restoredIndices: [],
    errors: [],
  }),
}));

import { run } from '@kbn/dev-cli-runner';
import type { RunContext } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { runCli } from './cli';

const mockClient = jest.requireMock('@elastic/elasticsearch').Client as jest.Mock;
const mockRun = run as jest.MockedFunction<typeof run>;

const createLog = (): ToolingLog =>
  ({
    info: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
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

describe('createEsClientFromUrl auth precedence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getRestoreHandler = () => {
    process.argv = ['node', 'scripts/es_snapshot_loader', 'restore'];
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
});
