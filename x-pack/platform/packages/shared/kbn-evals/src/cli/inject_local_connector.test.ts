/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { injectLocalConnector } from './inject_local_connector';

jest.mock('node:child_process', () => ({
  execFileSync: jest.fn(),
}));

const mockExecFileSync = execFileSync as jest.Mock;

describe('injectLocalConnector', () => {
  let fetchSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('connection refused'));
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    mockExecFileSync.mockImplementation(() => {
      throw new Error('command not found');
    });
    delete process.env.KIBANA_TESTING_AI_CONNECTORS;
    delete process.env.EVALUATION_CONNECTOR_ID;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    stderrSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('hard-fail when no local runtime is reachable', () => {
    it('throws with an actionable error message', async () => {
      const args = ['node', 'scripts/evals.js', 'run', '--suite', 'agent-builder', '--local'];

      await expect(injectLocalConnector(args)).rejects.toThrow(
        '--local requires a running local runtime, but none was detected'
      );
    });

    it('error message tells user to start Ollama or LM Studio', async () => {
      const args = ['node', 'scripts/evals.js', 'run', '--suite', 'agent-builder', '--local'];

      await expect(injectLocalConnector(args)).rejects.toThrow(
        'Start Ollama (`ollama serve`) or LM Studio'
      );
    });

    it('error message explains the fallback refusal', async () => {
      const args = ['node', 'scripts/evals.js', 'run', '--suite', 'agent-builder', '--local'];

      await expect(injectLocalConnector(args)).rejects.toThrow(
        'Refusing to silently fall back to the cloud connector'
      );
    });

    it('does not set env vars when no runtime found', async () => {
      const args = ['node', 'scripts/evals.js', 'run', '--suite', 'agent-builder', '--local'];

      await expect(injectLocalConnector(args)).rejects.toThrow();

      expect(process.env.EVALUATION_CONNECTOR_ID).toBeUndefined();
      expect(process.env.KIBANA_TESTING_AI_CONNECTORS).toBeUndefined();
    });

    it('strips --local from args before throwing', async () => {
      const args = ['node', 'scripts/evals.js', 'run', '--suite', 'agent-builder', '--local'];

      await expect(injectLocalConnector(args)).rejects.toThrow();

      // --local was stripped from args before detection ran
      expect(args).not.toContain('--local');
    });
  });

  describe('happy path: runtime reachable with a loaded model', () => {
    it('injects connector env vars when Ollama is running with a model', async () => {
      fetchSpy
        // first call: probeEndpoint(ollamaEndpoint) → ok
        .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
        // second call: getOllamaModels → returns a model
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ models: [{ name: 'llama3.2:3b', size: 2_000_000_000 }] }),
        } as unknown as Response);

      const args = ['node', 'scripts/evals.js', 'run', '--suite', 'agent-builder', '--local'];
      await injectLocalConnector(args);

      expect(process.env.EVALUATION_CONNECTOR_ID).toBe('local-eval-model');
      expect(process.env.KIBANA_TESTING_AI_CONNECTORS).toBeDefined();

      const decoded = JSON.parse(
        Buffer.from(process.env.KIBANA_TESTING_AI_CONNECTORS!, 'base64').toString('utf-8')
      );
      expect(decoded['local-eval-model'].config.defaultModel).toBe('llama3.2:3b');
      expect(decoded['local-eval-model'].config.apiUrl).toContain('/v1/chat/completions');
    });
  });

  describe('hard-fail when ollama binary exists but server is not running', () => {
    it('throws when binary is installed but server is not reachable', async () => {
      // ollama binary exists
      mockExecFileSync.mockImplementation((cmd: string, cmdArgs: string[]) => {
        if (cmd === 'sh' && cmdArgs.includes('ollama')) {
          return Buffer.from('/usr/local/bin/ollama');
        }
        throw new Error('not found');
      });

      const args = ['node', 'scripts/evals.js', 'run', '--suite', 'agent-builder', '--local'];

      await expect(injectLocalConnector(args)).rejects.toThrow(
        '--local requires a running local runtime, but none was detected'
      );
    });
  });
});
