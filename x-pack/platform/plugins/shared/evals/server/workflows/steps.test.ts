/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { EVALS_EVALUATE_URL, EVALS_ONLINE_SCORES_URL } from '@kbn/evals-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { isOneShotStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { EvaluateTraceStepId, PersistOnlineScoresStepId } from '../../common/workflows/steps';
import type { TaskProviderRegistry } from '../task_providers/types';
import { createEvalsServerSteps } from './steps';

const TRACE_ID = 'a'.repeat(32);

const getHandler = (stepId: string) => {
  const step = createEvalsServerSteps({
    logger: loggingSystemMock.createLogger(),
    taskProviderRegistry: {} as unknown as TaskProviderRegistry,
    getInferenceStart: async () => ({} as unknown as InferenceServerStart),
  }).find(({ id }) => id === stepId);

  if (!step || !isOneShotStepDefinition(step)) {
    throw new Error(`Step ${stepId} is not a one-shot step`);
  }
  return step.handler;
};

const buildContext = (input: unknown, callKibanaApi: jest.Mock) =>
  ({
    input,
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    contextManager: {
      callKibanaApi,
      getContext: () => ({ workflow: { spaceId: 'marketing' } }),
      getFakeRequest: jest.fn(),
    },
  } as unknown as StepHandlerContext);

const okResult = {
  status: 'ok',
  evaluator: { name: 'correctness', version: '1.0.0', kind: 'llm' },
  scores: [{ name: 'factuality', score: 0.9 }],
};
const errorResult = {
  status: 'error',
  evaluator: { name: 'groundedness', version: '1.0.0', kind: 'llm' },
  error: { message: 'rate limited' },
};

describe('ai.evals.evaluateTrace step', () => {
  const evaluateInput = {
    trace_id: TRACE_ID,
    evaluators: [{ name: 'correctness' }, { name: 'groundedness' }],
  };

  it('returns the successful results when only some evaluators fail', async () => {
    const callKibanaApi = jest.fn().mockResolvedValue({
      status: 200,
      headers: {},
      body: { results: [okResult, errorResult] },
    });

    const result = await getHandler(EvaluateTraceStepId)(
      buildContext(evaluateInput, callKibanaApi)
    );

    expect(callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: EVALS_EVALUATE_URL })
    );
    expect(result).toEqual({
      output: {
        results: [
          {
            evaluator: okResult.evaluator,
            scores: [expect.objectContaining({ name: 'factuality', score: 0.9 })],
          },
        ],
        errors: ['Evaluator "groundedness" failed: rate limited'],
      },
    });
  });

  it('throws when every evaluator fails, so the step can be retried', async () => {
    const callKibanaApi = jest.fn().mockResolvedValue({
      status: 200,
      headers: {},
      body: { results: [errorResult] },
    });

    await expect(
      getHandler(EvaluateTraceStepId)(buildContext(evaluateInput, callKibanaApi))
    ).rejects.toThrow(/every evaluator failed for trace/);
  });
});

describe('ai.evals.persistOnlineScores step', () => {
  it('persists the results and reports created, skipped and failed counts', async () => {
    const callKibanaApi = jest.fn().mockResolvedValue({
      status: 200,
      headers: {},
      body: { created: 1, skipped: 0, failed_evaluators: 0 },
    });

    const result = await getHandler(PersistOnlineScoresStepId)(
      buildContext(
        {
          monitor: { id: 'workflow-1', name: '[online-eval] quality monitor' },
          trace_id: TRACE_ID,
          connector_id: 'conn-1',
          results: [{ evaluator: okResult.evaluator, scores: okResult.scores }],
          errors: ['Evaluator "groundedness" failed: rate limited'],
        },
        callKibanaApi
      )
    );

    expect(callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: EVALS_ONLINE_SCORES_URL })
    );
    expect(result).toEqual({ output: { created: 1, skipped: 0, failed_evaluators: 1 } });
  });
});
