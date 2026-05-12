/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { SuiteRunner } from './suite_runner';
import type { SuiteRunConfig } from './suite_runner';

type MockStream = PassThrough;

interface MockChild extends EventEmitter {
  unref: jest.Mock;
  kill: jest.Mock;
  stdout: MockStream;
  stderr: MockStream;
}

const createMockStream = (): MockStream => {
  return new PassThrough();
};

const createMockChild = (): MockChild => {
  const child = new EventEmitter() as MockChild;
  child.unref = jest.fn();
  child.kill = jest.fn();
  child.stdout = createMockStream();
  child.stderr = createMockStream();
  return child;
};

// Track the latest mock child so tests can simulate process events
// Variable MUST start with "mock" for Jest's babel transform to allow it in jest.mock()
let mockLatestChild: MockChild;

jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    mockLatestChild = createMockChild();
    return mockLatestChild;
  }),
}));

let mockUuidCounter = 0;
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => `test-uuid-${++mockUuidCounter}`),
}));

describe('SuiteRunner', () => {
  const logger = loggingSystemMock.createLogger();
  let runner: SuiteRunner;

  const baseConfig: SuiteRunConfig = {
    suiteId: 'attack-discovery',
    configPath: 'x-pack/test/evals/attack_discovery/playwright.config.ts',
    connectorId: 'connector-123',
  };

  beforeEach(() => {
    runner = new SuiteRunner('/repo/root', logger);
    mockUuidCounter = 0;
    jest.clearAllMocks();
  });

  /** Helper: get the mock child from the last spawn call */
  const getSpawnedChild = (): MockChild => mockLatestChild;

  describe('startRun', () => {
    it('returns a run status with running state', () => {
      const status = runner.startRun(baseConfig);

      expect(status.suiteId).toBe('attack-discovery');
      expect(status.status).toBe('running');
      expect(status.startedAt).toBeDefined();
      expect(status.runId).toBeDefined();
    });

    it('throws when another run is already active', () => {
      runner.startRun(baseConfig);

      expect(() => runner.startRun(baseConfig)).toThrow(/already in progress/);
    });

    it('allows a new run after previous completes', () => {
      runner.startRun(baseConfig);
      getSpawnedChild().emit('exit', 0);

      expect(() => runner.startRun(baseConfig)).not.toThrow();
    });

    it('calls unref on spawned child', () => {
      runner.startRun(baseConfig);
      expect(getSpawnedChild().unref).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('returns status for a valid run ID', () => {
      const { runId } = runner.startRun(baseConfig);
      const status = runner.getStatus(runId);

      expect(status).toBeDefined();
      expect(status?.runId).toBe(runId);
      expect(status?.status).toBe('running');
    });

    it('returns undefined for unknown run ID', () => {
      expect(runner.getStatus('unknown-id')).toBeUndefined();
    });
  });

  describe('getCurrentRun', () => {
    it('returns undefined when no run has started', () => {
      expect(runner.getCurrentRun()).toBeUndefined();
    });

    it('returns the active run', () => {
      const { runId } = runner.startRun(baseConfig);
      const current = runner.getCurrentRun();

      expect(current?.runId).toBe(runId);
    });

    it('returns undefined after run completes', () => {
      runner.startRun(baseConfig);
      getSpawnedChild().emit('exit', 0);

      expect(runner.getCurrentRun()).toBeUndefined();
    });
  });

  describe('listRuns', () => {
    it('returns empty list initially', () => {
      expect(runner.listRuns()).toEqual([]);
    });

    it('returns all tracked runs', () => {
      const run1 = runner.startRun(baseConfig);
      getSpawnedChild().emit('exit', 0);

      const run2 = runner.startRun({ ...baseConfig, suiteId: 'suite-2' });

      const runs = runner.listRuns();
      expect(runs).toHaveLength(2);
      expect(runs.map((r) => r.runId)).toContain(run1.runId);
      expect(runs.map((r) => r.runId)).toContain(run2.runId);
    });
  });

  describe('process lifecycle', () => {
    it('sets status to completed on exit code 0', () => {
      const { runId } = runner.startRun(baseConfig);
      getSpawnedChild().emit('exit', 0);

      const status = runner.getStatus(runId);
      expect(status?.status).toBe('completed');
      expect(status?.exitCode).toBe(0);
      expect(status?.completedAt).toBeDefined();
      expect(status?.error).toBeUndefined();
    });

    it('sets status to failed on non-zero exit code', () => {
      const { runId } = runner.startRun(baseConfig);
      getSpawnedChild().emit('exit', 1);

      const status = runner.getStatus(runId);
      expect(status?.status).toBe('failed');
      expect(status?.exitCode).toBe(1);
      expect(status?.error).toContain('exited with code 1');
    });

    it('sets status to failed on process error', () => {
      const { runId } = runner.startRun(baseConfig);
      const child = getSpawnedChild();

      // Emit error — the handler in suite_runner.ts should catch this
      child.emit('error', new Error('spawn ENOENT'));

      const status = runner.getStatus(runId);
      expect(status?.status).toBe('failed');
      expect(status?.error).toBe('spawn ENOENT');
      expect(status?.completedAt).toBeDefined();
    });

    it('clears activeRunId after exit', () => {
      runner.startRun(baseConfig);
      getSpawnedChild().emit('exit', 0);

      expect(runner.getCurrentRun()).toBeUndefined();
    });

    it('clears activeRunId after error', () => {
      runner.startRun(baseConfig);
      getSpawnedChild().emit('error', new Error('fail'));

      expect(runner.getCurrentRun()).toBeUndefined();
    });
  });

  describe('spawn arguments', () => {
    it('passes connector ID as env variable', () => {
      runner.startRun(baseConfig);

      const { spawn } = jest.requireMock('child_process');
      const [, , opts] = spawn.mock.calls[0];
      expect(opts.env.EVALUATION_CONNECTOR_ID).toBe('connector-123');
      expect(opts.env.EVAL_SUITE_ID).toBe('attack-discovery');
    });

    it('passes project flag when specified', () => {
      runner.startRun({ ...baseConfig, project: 'my-project' });

      const { spawn } = jest.requireMock('child_process');
      const args = spawn.mock.calls[0][1];
      expect(args).toContain('--project');
      expect(args).toContain('my-project');
    });

    it('passes grep flag when specified', () => {
      runner.startRun({ ...baseConfig, grep: 'test pattern' });

      const { spawn } = jest.requireMock('child_process');
      const args = spawn.mock.calls[0][1];
      expect(args).toContain('--grep');
      expect(args).toContain('test pattern');
    });

    it('passes repetitions as env variable when specified', () => {
      runner.startRun({ ...baseConfig, repetitions: 3 });

      const { spawn } = jest.requireMock('child_process');
      const [, , opts] = spawn.mock.calls[0];
      expect(opts.env.EVALUATION_REPETITIONS).toBe('3');
    });

    it('uses detached mode with piped stdout/stderr', () => {
      runner.startRun(baseConfig);

      const { spawn } = jest.requireMock('child_process');
      const [, , opts] = spawn.mock.calls[0];
      expect(opts.detached).toBe(true);
      expect(opts.stdio).toEqual(['ignore', 'pipe', 'pipe']);
    });
  });

  describe('output capture', () => {
    it('initializes output as empty array', () => {
      const status = runner.startRun(baseConfig);
      expect(status.output).toEqual([]);
    });

    it('captures stdout lines into output', () => {
      const { runId } = runner.startRun(baseConfig);
      const child = getSpawnedChild();

      child.stdout.write('line 1\nline 2\n');

      const status = runner.getStatus(runId);
      expect(status?.output).toEqual(['line 1', 'line 2']);
    });

    it('captures stderr lines into output', () => {
      const { runId } = runner.startRun(baseConfig);
      const child = getSpawnedChild();

      child.stderr.write('error output\n');

      const status = runner.getStatus(runId);
      expect(status?.output).toEqual(['error output']);
    });

    it('combines stdout and stderr output', () => {
      const { runId } = runner.startRun(baseConfig);
      const child = getSpawnedChild();

      child.stdout.write('stdout line\n');
      child.stderr.write('stderr line\n');

      const status = runner.getStatus(runId);
      expect(status?.output).toEqual(['stdout line', 'stderr line']);
    });

    it('preserves ANSI color codes but strips cursor control sequences', () => {
      const { runId } = runner.startRun(baseConfig);
      const child = getSpawnedChild();

      // Color codes (\x1b[32m, \x1b[0m) should be preserved
      child.stdout.write('\x1b[32m  PASS\x1b[0m test.spec.ts\n');
      // Cursor up (\x1b[1A) and erase line (\x1b[2K) should be stripped
      child.stdout.write('\x1b[1A\x1b[2KUpdated progress line\n');

      const status = runner.getStatus(runId);
      expect(status?.output).toEqual([
        '\x1b[32m  PASS\x1b[0m test.spec.ts',
        'Updated progress line',
      ]);
    });

    it('filters out APM agent noise lines', () => {
      const { runId } = runner.startRun(baseConfig);
      const child = getSpawnedChild();

      child.stdout.write('{"activationMethod":"preload","message":"APM Node.js Agent v4.15.0"}\n');
      child.stdout.write('{"breakdownMetrics":{"source":"start","value":true}}\n');
      child.stdout.write('Running 3 tests using 2 workers\n');

      const status = runner.getStatus(runId);
      expect(status?.output).toEqual(['Running 3 tests using 2 workers']);
    });

    it('filters out debugger and deprecation noise', () => {
      const { runId } = runner.startRun(baseConfig);
      const child = getSpawnedChild();

      child.stderr.write('Debugger listening on ws://127.0.0.1:9229\n');
      child.stderr.write('For help, see: https://nodejs.org/en/docs/inspector\n');
      child.stderr.write('warning: some deprecated API\n');
      child.stderr.write('Error: actual test failure\n');

      const status = runner.getStatus(runId);
      expect(status?.output).toEqual(['Error: actual test failure']);
    });

    it('trims output to MAX_OUTPUT_LINES (200)', () => {
      const { runId } = runner.startRun(baseConfig);
      const child = getSpawnedChild();

      // Write 250 lines in one chunk
      const lines = Array.from({ length: 250 }, (_, i) => `line ${i}`).join('\n') + '\n';
      child.stdout.write(lines);

      const status = runner.getStatus(runId);
      expect(status?.output).toHaveLength(200);
      // Should keep the last 200 lines (50-249)
      expect(status?.output[0]).toBe('line 50');
      expect(status?.output[199]).toBe('line 249');
    });
  });
});
