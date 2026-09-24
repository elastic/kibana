/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'child_process';
import { ToolingLog } from '@kbn/tooling-log';

import { runConnectorSetup } from './init';

const mockReadCachedEisConnectors = jest.fn();
const mockWriteCachedEisConnectors = jest.fn();

jest.mock('../eis_connectors_cache', () => ({
  readCachedEisConnectors: () => mockReadCachedEisConnectors(),
  writeCachedEisConnectors: (connectors: Record<string, object>) =>
    mockWriteCachedEisConnectors(connectors),
}));

jest.mock('../utils', () => ({
  safeExec: jest.fn().mockReturnValue('{}'),
  getVaultAddr: jest.fn().mockReturnValue('https://vault.example'),
}));

jest.mock('../profiles', () => ({
  VAULT_CONFIG_DIR: 'config',
  resolveVaultConfigPath: jest.fn().mockReturnValue('config/config.json'),
  readVaultConfigFromDevVault: jest.fn().mockReturnValue(undefined),
}));

jest.mock('@kbn/es', () => ({
  resolveCcmApiKey: jest.fn().mockResolvedValue('ccm-api-key'),
}));

jest.mock('../prompts', () => ({
  isTTY: jest.fn().mockReturnValue(true),
  parseConnectorsFromEnv: jest.fn().mockReturnValue([]),
  parseConnectorsFromKibanaDevYml: jest.fn().mockReturnValue([]),
}));

jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({ connectorSource: 'eis' }),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn(),
  spawnSync: jest.fn(),
}));

const DISCOVERED_CONNECTORS = {
  'eis-claude-5-sonnet': {
    name: 'EIS claude-5-sonnet',
    inferenceId: '.anthropic-claude-5-sonnet',
    provider: 'elastic',
    taskType: 'chat_completion',
  },
};

const GENERATED_PAYLOAD = Buffer.from(JSON.stringify(DISCOVERED_CONNECTORS)).toString('base64');

const CACHED_CONNECTOR = {
  'eis-cached-only': {
    name: 'EIS cached-only',
    inferenceId: '.eis-cached-only',
    provider: 'elastic',
    taskType: 'chat_completion',
  },
};

describe('runConnectorSetup cache reuse', () => {
  let log: ToolingLog;

  beforeEach(() => {
    log = new ToolingLog();
    jest.spyOn(log, 'info').mockImplementation(() => undefined);
    delete process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;

    mockReadCachedEisConnectors.mockReturnValue(CACHED_CONNECTOR);
    mockWriteCachedEisConnectors.mockReset();

    (spawnSync as jest.Mock).mockImplementation((_cmd: string, args: string[]) =>
      args[0] === 'scripts/discover_eis_models.js'
        ? { status: 0 }
        : { status: 0, stdout: GENERATED_PAYLOAD, stderr: '' }
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;
  });

  it('reuses a fresh cache without re-discovering', async () => {
    await runConnectorSetup('/repo', log);

    expect(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS).toEqual(
      Buffer.from(JSON.stringify(CACHED_CONNECTOR)).toString('base64')
    );
    expect(spawnSync).not.toHaveBeenCalled();
    expect(mockWriteCachedEisConnectors).not.toHaveBeenCalled();
  });

  it('re-discovers and rewrites the cache when refresh is requested', async () => {
    // The fail-fast error points users at `node scripts/evals init --refresh`.
    // Without this the documented repair command handed back the same incomplete
    // cache and the run failed again (or 404d) on the next invocation.
    await runConnectorSetup('/repo', log, { refresh: true });

    expect(spawnSync).toHaveBeenCalledWith(
      'node',
      ['scripts/discover_eis_models.js'],
      expect.objectContaining({ cwd: '/repo' })
    );
    expect(mockWriteCachedEisConnectors).toHaveBeenCalledWith(DISCOVERED_CONNECTORS);
    expect(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS).toEqual(GENERATED_PAYLOAD);
  });
});
