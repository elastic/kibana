/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { API_VERSIONS } from '@kbn/evals-common';
import { registerListSuitesRoute } from './list_suites';
import { registerRunSuiteRoute } from './run_suite';
import { registerGetSuiteStatusRoute } from './get_suite_status';
import { registerGetSuiteRunsRoute } from './get_suite_runs';
import type { SuiteRunner, SuiteRunStatus } from '../../lib/suite_runner';
import { readFileSync } from 'fs';

// Mock only fs.readFileSync — delegate to the real implementation by default so
// @kbn/repo-info (and any other module that reads files during test bootstrap)
// keeps working. Individual tests override with `mockReturnValueOnce(...)`.
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    readFileSync: jest.fn(actualFs.readFileSync),
  };
});

const mockReadFileSync = readFileSync as jest.Mock;

const SUITES_URL = '/internal/evals/suites';
const SUITE_RUN_URL = '/internal/evals/suites/{suiteId}/run';
const SUITE_STATUS_URL = '/internal/evals/suites/{suiteId}/status';
const SUITE_RUNS_URL = '/internal/evals/suites/{suiteId}/runs';

const mockSuites = [
  {
    id: 'attack-discovery',
    name: 'Attack Discovery',
    configPath: 'x-pack/test/evals/attack_discovery/playwright.config.ts',
    tags: ['security', 'ai'],
    slackChannel: '#attack-discovery-evals',
    ciLabels: ['ci-label-1'],
  },
  {
    id: 'ai-assistant',
    name: 'AI Assistant',
    configPath: 'x-pack/test/evals/ai_assistant/playwright.config.ts',
    tags: ['security'],
  },
];

const mockSuitesJson = JSON.stringify({ suites: mockSuites });

interface MockSuiteRunner {
  startRun: jest.Mock;
  listRuns: jest.Mock;
  getStatus: jest.Mock;
  getCurrentRun: jest.Mock;
}

const createMockSuiteRunner = (): MockSuiteRunner => ({
  startRun: jest.fn(),
  listRuns: jest.fn(),
  getStatus: jest.fn(),
  getCurrentRun: jest.fn(),
});

const asSuiteRunner = (mock: MockSuiteRunner): SuiteRunner => mock as unknown as SuiteRunner;

const buildSuiteRunStatus = (overrides: Partial<SuiteRunStatus> = {}): SuiteRunStatus => ({
  runId: 'run-uuid-1',
  suiteId: 'attack-discovery',
  status: 'running',
  startedAt: '2026-01-01T00:00:00.000Z',
  output: [],
  ...overrides,
});

describe('suite routes', () => {
  const logger = loggingSystemMock.createLogger();
  const repoRoot = '/repo/root';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /internal/evals/suites', () => {
    const setup = (suiteRunner?: ReturnType<typeof createMockSuiteRunner>) => {
      const router = httpServiceMock.createRouter();
      registerListSuitesRoute({
        router,
        logger,
        repoRoot,
        suiteRunner: suiteRunner ? asSuiteRunner(suiteRunner) : undefined,
      });

      const versionedRouter = router.versioned as MockedVersionedRouter;
      const { handler } = versionedRouter.getRoute('get', SUITES_URL).versions[
        API_VERSIONS.internal.v1
      ];

      return { handler };
    };

    it('returns formatted suite list from evals.suites.json', async () => {
      mockReadFileSync.mockReturnValueOnce(mockSuitesJson);
      const { handler } = setup();

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITES_URL,
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        suites: [
          {
            id: 'attack-discovery',
            name: 'Attack Discovery',
            config_path: 'x-pack/test/evals/attack_discovery/playwright.config.ts',
            tags: ['security', 'ai'],
            slack_channel: '#attack-discovery-evals',
          },
          {
            id: 'ai-assistant',
            name: 'AI Assistant',
            config_path: 'x-pack/test/evals/ai_assistant/playwright.config.ts',
            tags: ['security'],
            slack_channel: undefined,
          },
        ],
      });
    });

    it('omits ciLabels from the response', async () => {
      mockReadFileSync.mockReturnValueOnce(mockSuitesJson);
      const { handler } = setup();

      const request = httpServerMock.createKibanaRequest({ method: 'get', path: SUITES_URL });
      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      const suite = response.payload.suites[0];
      expect(suite).not.toHaveProperty('ciLabels');
      expect(suite).not.toHaveProperty('ci_labels');
    });

    it('returns empty suites array when json has no suites key', async () => {
      mockReadFileSync.mockReturnValueOnce(JSON.stringify({}));
      const { handler } = setup();

      const request = httpServerMock.createKibanaRequest({ method: 'get', path: SUITES_URL });
      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ suites: [] });
    });

    it('returns 500 when readFileSync throws (missing file)', async () => {
      mockReadFileSync.mockImplementationOnce(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      const { handler } = setup();

      const request = httpServerMock.createKibanaRequest({ method: 'get', path: SUITES_URL });
      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual({
        message: expect.stringContaining('Failed to load suites:'),
      });
      expect(response.payload.message).toContain('ENOENT');
    });

    it('returns 500 when the file contains invalid JSON', async () => {
      mockReadFileSync.mockReturnValueOnce('not valid json');
      const { handler } = setup();

      const request = httpServerMock.createKibanaRequest({ method: 'get', path: SUITES_URL });
      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload.message).toContain('Failed to load suites:');
    });
  });

  describe('POST /internal/evals/suites/{suiteId}/run', () => {
    const setup = (suiteRunner?: ReturnType<typeof createMockSuiteRunner>) => {
      const router = httpServiceMock.createRouter();
      registerRunSuiteRoute({
        router,
        logger,
        repoRoot,
        suiteRunner: suiteRunner ? asSuiteRunner(suiteRunner) : undefined,
      });

      const versionedRouter = router.versioned as MockedVersionedRouter;
      const { handler } = versionedRouter.getRoute('post', SUITE_RUN_URL).versions[
        API_VERSIONS.internal.v1
      ];

      return { handler };
    };

    it('returns run details on successful start', async () => {
      mockReadFileSync.mockReturnValueOnce(mockSuitesJson);
      const suiteRunner = createMockSuiteRunner();
      const runStatus = buildSuiteRunStatus();
      suiteRunner.startRun.mockReturnValueOnce(runStatus);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: SUITE_RUN_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
        body: { connector_id: 'connector-abc' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        run_id: runStatus.runId,
        suite_id: runStatus.suiteId,
        status: runStatus.status,
        started_at: runStatus.startedAt,
      });
    });

    it('passes all optional params to startRun', async () => {
      mockReadFileSync.mockReturnValueOnce(mockSuitesJson);
      const suiteRunner = createMockSuiteRunner();
      const runStatus = buildSuiteRunStatus();
      suiteRunner.startRun.mockReturnValueOnce(runStatus);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: SUITE_RUN_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
        body: {
          connector_id: 'connector-abc',
          project: 'my-project',
          repetitions: 3,
          grep: 'my test',
        },
      });

      await handler({} as any, request, kibanaResponseFactory);

      expect(suiteRunner.startRun).toHaveBeenCalledWith({
        suiteId: 'attack-discovery',
        configPath: mockSuites[0].configPath,
        connectorId: 'connector-abc',
        project: 'my-project',
        repetitions: 3,
        grep: 'my test',
      });
    });

    it('returns 400 when suiteRunner is not available', async () => {
      const { handler } = setup(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: SUITE_RUN_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
        body: { connector_id: 'connector-abc' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(400);
      expect(response.payload).toEqual({ message: 'Suite runner not available' });
    });

    it('returns 404 when suiteId does not exist in evals.suites.json', async () => {
      mockReadFileSync.mockReturnValueOnce(mockSuitesJson);
      const suiteRunner = createMockSuiteRunner();

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: SUITE_RUN_URL.replace('{suiteId}', 'unknown-suite'),
        params: { suiteId: 'unknown-suite' },
        body: { connector_id: 'connector-abc' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(404);
      expect(response.payload).toEqual({
        message: 'Suite "unknown-suite" not found in evals.suites.json',
      });
      expect(suiteRunner.startRun).not.toHaveBeenCalled();
    });

    it('returns 500 when startRun throws', async () => {
      mockReadFileSync.mockReturnValueOnce(mockSuitesJson);
      const suiteRunner = createMockSuiteRunner();
      suiteRunner.startRun.mockImplementationOnce(() => {
        throw new Error('A suite run is already in progress');
      });

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: SUITE_RUN_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
        body: { connector_id: 'connector-abc' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual({
        message: 'A suite run is already in progress',
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('returns 500 when readFileSync throws while loading suites', async () => {
      mockReadFileSync.mockImplementationOnce(() => {
        throw new Error('ENOENT: no such file');
      });
      const suiteRunner = createMockSuiteRunner();

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'post',
        path: SUITE_RUN_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
        body: { connector_id: 'connector-abc' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload.message).toContain('ENOENT');
    });
  });

  describe('GET /internal/evals/suites/{suiteId}/status', () => {
    const setup = (suiteRunner?: ReturnType<typeof createMockSuiteRunner>) => {
      const router = httpServiceMock.createRouter();
      registerGetSuiteStatusRoute({
        router,
        logger,
        repoRoot,
        suiteRunner: suiteRunner ? asSuiteRunner(suiteRunner) : undefined,
      });

      const versionedRouter = router.versioned as MockedVersionedRouter;
      const { handler } = versionedRouter.getRoute('get', SUITE_STATUS_URL).versions[
        API_VERSIONS.internal.v1
      ];

      return { handler };
    };

    it('returns idle status when no suiteRunner is available', async () => {
      const { handler } = setup(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_STATUS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ status: 'idle', suite_id: 'attack-discovery' });
    });

    it('returns idle status when no runs exist for the suite', async () => {
      const suiteRunner = createMockSuiteRunner();
      suiteRunner.listRuns.mockReturnValueOnce([]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_STATUS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ status: 'idle', suite_id: 'attack-discovery' });
    });

    it('ignores runs for other suites and returns idle when no match', async () => {
      const suiteRunner = createMockSuiteRunner();
      suiteRunner.listRuns.mockReturnValueOnce([
        buildSuiteRunStatus({ suiteId: 'ai-assistant', runId: 'run-2' }),
      ]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_STATUS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ status: 'idle', suite_id: 'attack-discovery' });
    });

    it('returns latest run status when a run exists', async () => {
      const suiteRunner = createMockSuiteRunner();
      const runStatus = buildSuiteRunStatus({
        status: 'running',
        output: ['Running tests...'],
      });
      suiteRunner.listRuns.mockReturnValueOnce([runStatus]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_STATUS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        suite_id: 'attack-discovery',
        run_id: runStatus.runId,
        status: 'running',
        started_at: runStatus.startedAt,
        completed_at: undefined,
        exit_code: undefined,
        error: undefined,
        output: ['Running tests...'],
      });
    });

    it('returns completed run details including exit_code and completed_at', async () => {
      const suiteRunner = createMockSuiteRunner();
      const runStatus = buildSuiteRunStatus({
        status: 'completed',
        completedAt: '2026-01-01T01:00:00.000Z',
        exitCode: 0,
        output: ['3 passed'],
      });
      suiteRunner.listRuns.mockReturnValueOnce([runStatus]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_STATUS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.status).toBe('completed');
      expect(response.payload.exit_code).toBe(0);
      expect(response.payload.completed_at).toBe('2026-01-01T01:00:00.000Z');
    });

    it('returns failed run details including error message', async () => {
      const suiteRunner = createMockSuiteRunner();
      const runStatus = buildSuiteRunStatus({
        status: 'failed',
        completedAt: '2026-01-01T01:00:00.000Z',
        exitCode: 1,
        error: 'Process exited with code 1',
        output: ['1 failed'],
      });
      suiteRunner.listRuns.mockReturnValueOnce([runStatus]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_STATUS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.status).toBe('failed');
      expect(response.payload.error).toBe('Process exited with code 1');
      expect(response.payload.exit_code).toBe(1);
    });

    it('returns the first (most recent) run when multiple runs exist for the suite', async () => {
      const suiteRunner = createMockSuiteRunner();
      const recentRun = buildSuiteRunStatus({ runId: 'run-recent', status: 'completed' });
      const olderRun = buildSuiteRunStatus({ runId: 'run-older', status: 'failed' });
      // listRuns returns newest first (sorted by startedAt desc in SuiteRunner)
      suiteRunner.listRuns.mockReturnValueOnce([recentRun, olderRun]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_STATUS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.run_id).toBe('run-recent');
      expect(response.payload.status).toBe('completed');
    });

    it('exposes eval_run_id in the status response when set', async () => {
      const suiteRunner = createMockSuiteRunner();
      const runStatus = buildSuiteRunStatus({
        status: 'completed',
        completedAt: '2026-01-01T01:00:00.000Z',
        exitCode: 0,
        evalRunId: '5ede1fceaacc7a6e',
      });
      suiteRunner.listRuns.mockReturnValueOnce([runStatus]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_STATUS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.eval_run_id).toBe('5ede1fceaacc7a6e');
    });

    it('omits eval_run_id when the kbn-evals run_id has not been observed yet', async () => {
      const suiteRunner = createMockSuiteRunner();
      // Early in the run (before the first experiment finishes), evalRunId
      // is undefined — the API should forward that rather than returning ''.
      const runStatus = buildSuiteRunStatus({ status: 'running' });
      suiteRunner.listRuns.mockReturnValueOnce([runStatus]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_STATUS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.eval_run_id).toBeUndefined();
    });
  });

  describe('GET /internal/evals/suites/{suiteId}/runs', () => {
    const setup = (suiteRunner?: ReturnType<typeof createMockSuiteRunner>) => {
      const router = httpServiceMock.createRouter();
      registerGetSuiteRunsRoute({
        router,
        logger,
        repoRoot,
        suiteRunner: suiteRunner ? asSuiteRunner(suiteRunner) : undefined,
      });

      const versionedRouter = router.versioned as MockedVersionedRouter;
      const { handler } = versionedRouter.getRoute('get', SUITE_RUNS_URL).versions[
        API_VERSIONS.internal.v1
      ];

      return { handler };
    };

    it('returns empty runs array when no suiteRunner is available', async () => {
      const { handler } = setup(undefined);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_RUNS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ runs: [] });
    });

    it('returns empty runs array when no runs exist for the suite', async () => {
      const suiteRunner = createMockSuiteRunner();
      suiteRunner.listRuns.mockReturnValueOnce([]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_RUNS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ runs: [] });
    });

    it('filters out runs for other suites', async () => {
      const suiteRunner = createMockSuiteRunner();
      suiteRunner.listRuns.mockReturnValueOnce([
        buildSuiteRunStatus({ suiteId: 'attack-discovery', runId: 'run-1' }),
        buildSuiteRunStatus({ suiteId: 'ai-assistant', runId: 'run-2' }),
        buildSuiteRunStatus({ suiteId: 'attack-discovery', runId: 'run-3' }),
      ]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_RUNS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.runs).toHaveLength(2);
      expect(response.payload.runs.map((r: { run_id: string }) => r.run_id)).toEqual([
        'run-1',
        'run-3',
      ]);
    });

    it('returns runs with correct field mapping', async () => {
      const suiteRunner = createMockSuiteRunner();
      const runStatus = buildSuiteRunStatus({
        status: 'completed',
        completedAt: '2026-01-01T01:00:00.000Z',
        exitCode: 0,
        evalRunId: '5ede1fceaacc7a6e',
        output: ['3 passed'],
      });
      suiteRunner.listRuns.mockReturnValueOnce([runStatus]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_RUNS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.runs).toHaveLength(1);
      expect(response.payload.runs[0]).toEqual({
        run_id: runStatus.runId,
        eval_run_id: '5ede1fceaacc7a6e',
        suite_id: runStatus.suiteId,
        status: 'completed',
        started_at: runStatus.startedAt,
        completed_at: '2026-01-01T01:00:00.000Z',
        exit_code: 0,
        error: undefined,
        output: ['3 passed'],
      });
    });

    it('returns failed runs with error details', async () => {
      const suiteRunner = createMockSuiteRunner();
      const runStatus = buildSuiteRunStatus({
        status: 'failed',
        completedAt: '2026-01-01T01:00:00.000Z',
        exitCode: 1,
        error: 'Process exited with code 1',
        output: ['2 failed'],
      });
      suiteRunner.listRuns.mockReturnValueOnce([runStatus]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_RUNS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.runs[0].error).toBe('Process exited with code 1');
      expect(response.payload.runs[0].exit_code).toBe(1);
    });

    it('returns multiple runs in the order listRuns provides', async () => {
      const suiteRunner = createMockSuiteRunner();
      const run1 = buildSuiteRunStatus({ runId: 'run-newest', status: 'running' });
      const run2 = buildSuiteRunStatus({ runId: 'run-middle', status: 'completed' });
      const run3 = buildSuiteRunStatus({ runId: 'run-oldest', status: 'failed' });
      suiteRunner.listRuns.mockReturnValueOnce([run1, run2, run3]);

      const { handler } = setup(suiteRunner);

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: SUITE_RUNS_URL.replace('{suiteId}', 'attack-discovery'),
        params: { suiteId: 'attack-discovery' },
      });

      const response = await handler({} as any, request, kibanaResponseFactory);

      expect(response.status).toBe(200);
      expect(response.payload.runs).toHaveLength(3);
      expect(response.payload.runs[0].run_id).toBe('run-newest');
      expect(response.payload.runs[1].run_id).toBe('run-middle');
      expect(response.payload.runs[2].run_id).toBe('run-oldest');
    });
  });
});
