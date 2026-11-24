/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  EVAL_BASELINES_PIN_URL,
  EVAL_BASELINES_LATEST_URL,
  EVAL_BASELINE_SCORES_URL,
  MAX_PINNABLE_SCORES,
  UNBOUNDED_SCORE_FIELDS,
} from '@kbn/evals-common';
import type { RouteDependencies } from '../types';
import type { InternalStartServices } from '../../services';
import { registerEvalBaselineRoutes } from './eval_baselines';

const createScoreSource = (judgeModelId = 'glm-5.2') => ({
  '@timestamp': '2026-11-01T00:00:00.000Z',
  experiment_id: 'exp-1',
  space_ids: ['space-a'],
  metadata: {
    execution_id: 'run-1::suite::model',
    suite_id: 'agent-builder-regression',
    git: { branch: 'main', commit_sha: 'abc123' },
  },
  example: { id: 'example-1', dataset: { id: 'dataset-1', name: 'Dataset 1' } },
  task: { model: { id: 'gpt-test', provider: 'openai', family: 'gpt' } },
  evaluator: {
    name: 'correctness',
    kind: 'llm',
    score: 1,
    model: { id: judgeModelId, provider: 'eis', family: 'glm' },
  },
});

const createSearchResponse = (sources: Array<Record<string, unknown>>, total = sources.length) => ({
  hits: {
    total: { value: total },
    hits: sources.map((source, index) => ({ _id: `score-doc-${index + 1}`, _source: source })),
  },
});

describe('eval baselines routes', () => {
  let handlers: Record<string, (ctx: any, req: any, res: any) => Promise<any>>;
  let routeConfigs: Record<string, { security?: { authz?: { requiredPrivileges?: string[] } } }>;
  let pin: jest.Mock;
  let repin: jest.Mock;
  let findLatest: jest.Mock;
  let getScores: jest.Mock;
  let search: jest.Mock;
  let evalsStart: { evaluationScoreService?: { search: jest.Mock } } | undefined;

  const createContext = (spaceId = 'space-a') =>
    ({
      licensing: Promise.resolve({
        license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
      }),
      agentBuilder: Promise.resolve({
        spaces: { getSpaceId: () => spaceId },
      }),
    } as any);

  beforeEach(() => {
    jest.clearAllMocks();

    pin = jest.fn();
    repin = jest.fn();
    findLatest = jest.fn();
    getScores = jest.fn();
    search = jest.fn();
    evalsStart = { evaluationScoreService: { search } };

    handlers = {};
    routeConfigs = {};
    const register = (
      config: { path: string; security?: { authz?: { requiredPrivileges?: string[] } } },
      handler: any
    ) => {
      handlers[config.path] = handler;
      routeConfigs[config.path] = config;
    };

    registerEvalBaselineRoutes({
      router: { get: register, post: register },
      coreSetup: {
        getStartServices: jest.fn().mockImplementation(async () => [{}, { evals: evalsStart }]),
      },
      getInternalServices: () =>
        ({
          evalBaselines: { pin, repin, findLatest, getScores },
        } as unknown as InternalStartServices),
      pluginsSetup: { evals: { enabled: true, mode: 'full' } },
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);
  });

  it('registers nothing unless the evals plugin is enabled and runs in full mode', () => {
    for (const pluginsSetup of [
      {},
      { evals: { enabled: true, mode: 'runtime' } },
      // The setup contract reports the configured mode even when the plugin is disabled.
      { evals: { enabled: false, mode: 'full' } },
    ]) {
      const registered: string[] = [];
      const capture = (config: { path: string }) => registered.push(config.path);

      registerEvalBaselineRoutes({
        router: { get: capture, post: capture },
        coreSetup: { getStartServices: jest.fn() },
        getInternalServices: () => ({} as InternalStartServices),
        pluginsSetup,
        logger: loggingSystemMock.createLogger(),
      } as unknown as RouteDependencies);

      expect(registered).toEqual([]);
    }
  });

  it('demands the evals privileges, which the evaluations-cluster keys carry', () => {
    expect(routeConfigs[EVAL_BASELINES_PIN_URL].security?.authz?.requiredPrivileges).toEqual([
      'manage_evals',
    ]);
    expect(routeConfigs[EVAL_BASELINES_LATEST_URL].security?.authz?.requiredPrivileges).toEqual([
      'read_evals',
    ]);
    expect(routeConfigs[EVAL_BASELINE_SCORES_URL].security?.authz?.requiredPrivileges).toEqual([
      'read_evals',
    ]);
  });

  describe('pin', () => {
    const pinRequest = () =>
      httpServerMock.createKibanaRequest({
        method: 'post',
        path: EVAL_BASELINES_PIN_URL,
        body: {
          suite_id: 'agent-builder-regression',
          execution_id: 'run-1::suite::model',
          reason: 'monthly re-pin',
          pinned_by: 'pipeline',
        },
      });

    it('snapshots the execution scores and publishes the pointer', async () => {
      search.mockResolvedValue(createSearchResponse([createScoreSource(), createScoreSource()]));
      pin.mockResolvedValue({ baseline_id: 'baseline-1' });

      const response = await handlers[EVAL_BASELINES_PIN_URL](
        createContext(),
        pinRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ baseline: { baseline_id: 'baseline-1' } });
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: MAX_PINNABLE_SCORES,
          track_total_hits: true,
          allow_partial_search_results: false,
          _source_excludes: UNBOUNDED_SCORE_FIELDS,
        })
      );
      expect(pin).toHaveBeenCalledWith(
        expect.objectContaining({
          pointer: expect.objectContaining({
            suite_id: 'agent-builder-regression',
            execution_id: 'run-1::suite::model',
            judge_model_id: 'glm-5.2',
            task_model: { id: 'gpt-test', provider: 'openai', family: 'gpt' },
            reason: 'monthly re-pin',
            pinned_by: 'pipeline',
          }),
          spaceIds: ['space-a'],
        })
      );
    });

    it('derives the baseline id from the suite and execution, so retries rewrite the same pin', async () => {
      search.mockResolvedValue(createSearchResponse([createScoreSource()]));
      pin.mockResolvedValue({ baseline_id: 'ignored' });

      await handlers[EVAL_BASELINES_PIN_URL](createContext(), pinRequest(), kibanaResponseFactory);
      await handlers[EVAL_BASELINES_PIN_URL](createContext(), pinRequest(), kibanaResponseFactory);

      const [first, second] = pin.mock.calls.map(([args]) => args.pointer.baseline_id);
      expect(first).toMatch(/^[0-9a-f]{64}$/);
      expect(second).toBe(first);
    });

    it('returns 404 when the execution has no scores and no stored snapshot', async () => {
      search.mockResolvedValue(createSearchResponse([]));
      repin.mockResolvedValue(undefined);

      const response = await handlers[EVAL_BASELINES_PIN_URL](
        createContext(),
        pinRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(404);
      expect(repin).toHaveBeenCalled();
      expect(pin).not.toHaveBeenCalled();
    });

    it('promotes the stored snapshot when the source scores aged out of retention', async () => {
      search.mockResolvedValue(createSearchResponse([]));
      repin.mockResolvedValue({ baseline_id: 'baseline-1', score_count: 7 });

      const response = await handlers[EVAL_BASELINES_PIN_URL](
        createContext(),
        pinRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({
        baseline: { baseline_id: 'baseline-1', score_count: 7 },
      });
      expect(repin).toHaveBeenCalledWith({
        baselineId: expect.stringMatching(/^[0-9a-f]{64}$/),
        pinnedBy: 'pipeline',
        reason: 'monthly re-pin',
      });
      expect(pin).not.toHaveBeenCalled();
    });

    it('derives a different baseline id when the same execution is pinned in another space', async () => {
      search.mockResolvedValue(createSearchResponse([createScoreSource()]));
      pin.mockResolvedValue({ baseline_id: 'ignored' });

      await handlers[EVAL_BASELINES_PIN_URL](
        createContext('space-a'),
        pinRequest(),
        kibanaResponseFactory
      );
      await handlers[EVAL_BASELINES_PIN_URL](
        createContext('space-b'),
        pinRequest(),
        kibanaResponseFactory
      );

      const [first, second] = pin.mock.calls.map(([args]) => args.pointer.baseline_id);
      expect(first).toMatch(/^[0-9a-f]{64}$/);
      expect(second).toMatch(/^[0-9a-f]{64}$/);
      // Each space owns its own baseline documents for a shared execution.
      expect(second).not.toBe(first);
    });

    it('refuses a mixed-judge execution', async () => {
      search.mockResolvedValue(
        createSearchResponse([createScoreSource('glm-5.2'), createScoreSource('gpt-judge')])
      );

      const response = await handlers[EVAL_BASELINES_PIN_URL](
        createContext(),
        pinRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(400);
      expect(response.payload.message).toContain('multiple judge models');
      expect(pin).not.toHaveBeenCalled();
    });

    it('refuses to pin an execution with more scores than a snapshot can hold', async () => {
      search.mockResolvedValue(
        createSearchResponse([createScoreSource()], MAX_PINNABLE_SCORES + 1)
      );

      const response = await handlers[EVAL_BASELINES_PIN_URL](
        createContext(),
        pinRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(400);
      expect(response.payload.message).toContain(`${MAX_PINNABLE_SCORES}`);
      expect(pin).not.toHaveBeenCalled();
    });

    it('returns 501 when the evals plugin score service is unavailable', async () => {
      evalsStart = undefined;

      const response = await handlers[EVAL_BASELINES_PIN_URL](
        createContext(),
        pinRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(501);
      expect(response.payload.message).toContain('xpack.evals.mode=full');
    });

    it('returns 500 when publishing the baseline fails', async () => {
      search.mockResolvedValue(createSearchResponse([createScoreSource()]));
      pin.mockRejectedValue(new Error('bulk write failed'));

      const response = await handlers[EVAL_BASELINES_PIN_URL](
        createContext(),
        pinRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(500);
    });
  });

  describe('latest', () => {
    const latestRequest = () =>
      httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVAL_BASELINES_LATEST_URL,
        query: { suite_id: 'agent-builder-regression', model_id: 'gpt-test' },
      });

    it('resolves the latest baseline for the suite, model and space', async () => {
      findLatest.mockResolvedValue({ baseline_id: 'baseline-1' });

      const response = await handlers[EVAL_BASELINES_LATEST_URL](
        createContext(),
        latestRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ baseline: { baseline_id: 'baseline-1' } });
      expect(findLatest).toHaveBeenCalledWith({
        suiteId: 'agent-builder-regression',
        modelId: 'gpt-test',
        spaceId: 'space-a',
      });
    });

    it('answers a missing pin with 200 and a null baseline, not an error', async () => {
      findLatest.mockResolvedValue(undefined);

      const response = await handlers[EVAL_BASELINES_LATEST_URL](
        createContext(),
        latestRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ baseline: null });
    });
  });

  describe('scores', () => {
    const scoresRequest = () =>
      httpServerMock.createKibanaRequest({
        method: 'get',
        path: EVAL_BASELINE_SCORES_URL,
        params: { baselineId: 'baseline-1' },
      });

    it('returns the snapshotted scores with their total', async () => {
      const score = createScoreSource();
      getScores.mockResolvedValue([score]);

      const response = await handlers[EVAL_BASELINE_SCORES_URL](
        createContext(),
        scoresRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(200);
      expect(response.payload).toEqual({ scores: [score], total: 1 });
      expect(getScores).toHaveBeenCalledWith({ baselineId: 'baseline-1', spaceId: 'space-a' });
    });

    it('answers an unknown baseline id with 404', async () => {
      getScores.mockResolvedValue(undefined);

      const response = await handlers[EVAL_BASELINE_SCORES_URL](
        createContext(),
        scoresRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(404);
    });

    it('returns 500 when reading the snapshot fails', async () => {
      getScores.mockRejectedValue(new Error('search failed'));

      const response = await handlers[EVAL_BASELINE_SCORES_URL](
        createContext(),
        scoresRequest(),
        kibanaResponseFactory
      );

      expect(response.status).toBe(500);
    });
  });
});
