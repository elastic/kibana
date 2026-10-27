/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistryMock } from '../evaluators/registry.mock';
import { awaitTraceReady } from '../evaluators/trace_readiness';
import type { EvaluatorDefinition } from '../evaluators/types';
import { EvaluationExecutionError } from './evaluation_execution_error';
import { createEvaluationService, type EvaluateOptions } from './evaluation_service';

jest.mock('../evaluators/trace_readiness', () => ({
  ...jest.requireActual('../evaluators/trace_readiness'),
  awaitTraceReady: jest.fn(),
}));
const awaitTraceReadyMock = awaitTraceReady as jest.MockedFunction<typeof awaitTraceReady>;

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const ROUND = {
  input: { message: 'Why is checkout failing?' },
  response: { message: 'The payments service is returning 503s.' },
  steps: [],
};

const buildEvaluator = ({
  name,
  kind = 'code',
  version = '1.0.0',
  evaluate = jest.fn().mockResolvedValue({ scores: [{ name, score: 1 }] }),
}: Pick<EvaluatorDefinition, 'name'> & Partial<EvaluatorDefinition>): EvaluatorDefinition => ({
  name,
  version,
  kind,
  origin: 'built_in',
  description: `${name} evaluator`,
  direction: 'maximize',
  evaluate,
});

describe('createEvaluationService', () => {
  const request = {} as KibanaRequest;
  const traceReader = { search: jest.fn() } as unknown as ElasticsearchClient;

  const setup = (definitions: EvaluatorDefinition[]) => {
    const logger = loggingSystemMock.createLogger();
    const evaluatorRegistry = createEvaluatorRegistryMock(definitions);
    const asScoped = jest.spyOn(evaluatorRegistry, 'asScoped');
    const getClient = jest.fn().mockReturnValue({ prompt: jest.fn() });
    const service = createEvaluationService({
      evaluatorRegistry,
      logger,
      getInferenceStart: async () => ({ getClient } as unknown as InferenceServerStart),
    });
    const evaluate = (options: Partial<EvaluateOptions> & Pick<EvaluateOptions, 'evaluators'>) =>
      service.evaluate({
        request,
        spaceId: 'default',
        subject: { mode: 'single-turn', traces: [{ trace_id: TRACE_ID }] },
        traceReader,
        ...options,
      });

    return { evaluate, logger, asScoped, getClient };
  };

  beforeEach(() => {
    awaitTraceReadyMock.mockResolvedValue({
      round: ROUND,
      profile: 'elastic-inference',
      readiness: 'complete',
      evidence: {
        user_query: { status: 'found' },
        agent_response: { status: 'found' },
        tool_calls: { status: 'not_found' },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves evaluators in the given space and returns their scores', async () => {
    const groundedness = buildEvaluator({
      name: 'groundedness',
      kind: 'llm',
      evaluate: jest.fn().mockResolvedValue({
        scores: [{ name: 'groundedness', score: 0.9, label: 'GROUNDED' }],
      }),
    });
    const { evaluate, asScoped, getClient, logger } = setup([groundedness]);

    const results = await evaluate({
      spaceId: 'payments',
      evaluators: [{ name: 'groundedness', connector_id: 'judge-connector' }],
    });

    expect(asScoped).toHaveBeenCalledWith({ spaceId: 'payments' });
    expect(results).toEqual([
      {
        status: 'ok',
        evaluator: { name: 'groundedness', version: '1.0.0', kind: 'llm', direction: 'maximize' },
        scores: [{ name: 'groundedness', score: 0.9, label: 'GROUNDED' }],
      },
    ]);
    expect(getClient).toHaveBeenCalledWith({ request, bindTo: { connectorId: 'judge-connector' } });
    expect(groundedness.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        trace: expect.objectContaining({ traceId: TRACE_ID, esClient: traceReader }),
        round: ROUND,
        log: logger,
      })
    );
  });

  it('returns a failing evaluator as an error result without failing its siblings', async () => {
    const failing = buildEvaluator({
      name: 'failing',
      evaluate: jest.fn().mockRejectedValue(new Error('judge timed out')),
    });
    const latency = buildEvaluator({ name: 'latency' });
    const { evaluate } = setup([failing, latency]);

    const results = await evaluate({ evaluators: [{ name: 'failing' }, { name: 'latency' }] });

    expect(results).toEqual([
      expect.objectContaining({
        status: 'error',
        evaluator: expect.objectContaining({ name: 'failing' }),
        error: { message: 'judge timed out' },
      }),
      expect.objectContaining({
        status: 'ok',
        evaluator: expect.objectContaining({ name: 'latency' }),
        scores: [{ name: 'latency', score: 1 }],
      }),
    ]);
  });

  it('throws for an unknown evaluator before running any', async () => {
    const latency = buildEvaluator({ name: 'latency' });
    const { evaluate } = setup([latency]);

    const evaluation = evaluate({ evaluators: [{ name: 'latency' }, { name: 'missing' }] });

    await expect(evaluation).rejects.toThrow(EvaluationExecutionError);
    await expect(evaluation).rejects.toMatchObject({
      message: 'Evaluator not found: missing',
      responseType: 'badRequest',
    });
    expect(latency.evaluate).not.toHaveBeenCalled();
    expect(awaitTraceReadyMock).not.toHaveBeenCalled();
  });

  it('throws for a pinned version that does not exist', async () => {
    const { evaluate } = setup([buildEvaluator({ name: 'latency' })]);

    await expect(
      evaluate({ evaluators: [{ name: 'latency', version: '9.9.9' }] })
    ).rejects.toMatchObject({
      message: 'Evaluator not found: latency@9.9.9',
      responseType: 'badRequest',
    });
  });

  it('throws when an evaluator is selected twice', async () => {
    const latency = buildEvaluator({ name: 'latency' });
    const { evaluate } = setup([latency]);

    await expect(
      evaluate({ evaluators: [{ name: 'latency' }, { name: 'latency' }] })
    ).rejects.toMatchObject({
      message: expect.stringContaining('listed more than once: latency'),
      responseType: 'badRequest',
    });
    expect(latency.evaluate).not.toHaveBeenCalled();
  });
});
