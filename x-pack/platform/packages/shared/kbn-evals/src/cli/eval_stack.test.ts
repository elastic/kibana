/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { ensureScout } from './eval_stack';
import { startService } from './services';

jest.mock('./profiles', () => ({ probeHttp: jest.fn().mockResolvedValue(true) }));
jest.mock('./services', () => ({
  isServiceRunning: jest.fn().mockReturnValue(false),
  startService: jest.fn(),
  connectorsHash: jest.fn(),
  scoutEnvHash: jest.fn(),
  tailLog: jest.fn().mockReturnValue(jest.fn()),
}));

it('starts Scout with server settings without forwarding evaluation client credentials', async () => {
  const repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'evals-scout-env-'));
  const env = {
    NIGHTSHIFT_DATASETS: 'trace-only',
    NIGHTSHIFT_CONCURRENCY: '16',
    NIGHTSHIFT_DATASET_ID: 'stored-dataset',
    EVAL_KBN_URL: 'https://results.example.test',
    EVAL_KBN_API_KEY: 'results-client-key',
    TRACING_ES_URL: 'https://traces.example.test',
    TRACING_ES_API_KEY: 'traces-client-key',
  };
  jest.mocked(startService).mockImplementation(() => {
    const configDir = Path.join(repoRoot, '.scout/servers');
    Fs.mkdirSync(configDir, { recursive: true });
    Fs.writeFileSync(
      Path.join(configDir, 'local.json'),
      JSON.stringify({
        hosts: { kibana: 'http://localhost:5620', elasticsearch: 'http://localhost:9220' },
      })
    );
    return 123;
  });

  try {
    await ensureScout({
      repoRoot,
      log: new ToolingLog(),
      gcsCredentials: 'dataset-storage-credentials',
      tracingExporters: 'server-trace-exporters',
      serverConfigSet: 'evals_nightshift_investigations',
      env,
    });

    expect(startService).toHaveBeenCalledWith(
      repoRoot,
      'scout',
      'node',
      expect.any(Array),
      expect.any(ToolingLog),
      expect.objectContaining({
        env: {
          NIGHTSHIFT_DATASETS: 'trace-only',
          NIGHTSHIFT_CONCURRENCY: '16',
          GCS_CREDENTIALS: 'dataset-storage-credentials',
          TRACING_EXPORTERS: 'server-trace-exporters',
        },
      })
    );
    expect(env.EVAL_KBN_API_KEY).toBe('results-client-key');
    expect(env.TRACING_ES_API_KEY).toBe('traces-client-key');
  } finally {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});
