/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { z } from '@kbn/zod/v4';
import { createEvaluatorRegistryMock } from '../evaluators/registry.mock';
import { latencyEvaluatorDef } from '../evaluators/trace_metrics';
import { awaitTraceReady } from '../evaluators/trace_readiness';
import type { EvaluatorDefinition } from '../evaluators/types';
import { EvaluationExecutionError } from './evaluation_execution_error';
import { createEvaluationService, type EvaluateOptions } from './evaluation_service';
import type { InMemoryEvidence } from './execute_evaluators';

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

const buildResponseError = (statusCode: number): errors.ResponseError =>
  new errors.ResponseError({
    statusCode,
    body: {},
    headers: {},
    warnings: [],
    meta: {} as ConstructorParameters<typeof errors.ResponseError>[0]['meta'],
  });

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
    const evaluate = ({
      evaluators,
      spaceId = 'default',
    }: Pick<EvaluateOptions, 'evaluators'> & { spaceId?: string }) =>
      service.evaluate({
        request,
        spaceId,
        subject: { mode: 'single-turn', traces: [{ trace_id: TRACE_ID }] },
        traceReader,
        evaluators,
      });
    const evaluateEvidence = ({
      evaluators,
      evidence,
    }: Pick<EvaluateOptions, 'evaluators'> & { evidence: InMemoryEvidence }) =>
      service.evaluate({ request, spaceId: 'default', evaluators, evidence });

    return { evaluate, evaluateEvidence, logger, asScoped, getClient };
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

  it('throws a forbidden error when the trace reader lacks privileges', async () => {
    awaitTraceReadyMock.mockRejectedValueOnce(buildResponseError(403));
    const latency = buildEvaluator({ name: 'latency' });
    const { evaluate } = setup([latency]);

    const evaluation = evaluate({ evaluators: [{ name: 'latency' }] });

    await expect(evaluation).rejects.toThrow(EvaluationExecutionError);
    await expect(evaluation).rejects.toMatchObject({
      message:
        'Insufficient Elasticsearch privileges to read the trace. Grant read access to traces-* and logs-*.',
      responseType: 'forbidden',
    });
    expect(latency.evaluate).not.toHaveBeenCalled();
  });

  it('rethrows other Elasticsearch errors unchanged', async () => {
    const searchFailure = buildResponseError(500);
    awaitTraceReadyMock.mockRejectedValueOnce(searchFailure);
    const { evaluate } = setup([buildEvaluator({ name: 'latency' })]);

    await expect(evaluate({ evaluators: [{ name: 'latency' }] })).rejects.toBe(searchFailure);
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

  describe('in-memory evidence', () => {
    const EVIDENCE_ROUND = {
      input: { message: 'Why did the checkout alert fire?' },
      response: { message: 'A bad deploy of the payments service.' },
      steps: [{ tool_id: 'search_logs', arguments: { service: 'payments' }, result: { hits: 12 } }],
    };

    it('grades the round it is given without reading a trace', async () => {
      const groundedness = buildEvaluator({ name: 'groundedness', kind: 'llm' });
      const { evaluateEvidence, getClient } = setup([groundedness]);

      const results = await evaluateEvidence({
        evaluators: [{ name: 'groundedness', connector_id: 'judge-connector' }],
        evidence: { round: EVIDENCE_ROUND, referenceData: { expected: 'A bad deploy' } },
      });

      expect(results).toEqual([expect.objectContaining({ status: 'ok' })]);
      expect(awaitTraceReadyMock).not.toHaveBeenCalled();
      expect(traceReader.search).not.toHaveBeenCalled();
      expect(getClient).toHaveBeenCalledWith({
        request,
        bindTo: { connectorId: 'judge-connector' },
      });
      const [context] = (groundedness.evaluate as jest.Mock).mock.calls[0];
      expect(context.round).toBe(EVIDENCE_ROUND);
      expect(context.referenceData).toEqual({ expected: 'A bad deploy' });
      expect(context.trace).toBeUndefined();
    });

    it('fails an evaluator that reads the trace, without failing the others', async () => {
      const groundedness = buildEvaluator({ name: 'groundedness' });
      const { evaluateEvidence } = setup([latencyEvaluatorDef, groundedness]);

      const results = await evaluateEvidence({
        evaluators: [{ name: 'latency' }, { name: 'groundedness' }],
        evidence: { round: EVIDENCE_ROUND },
      });

      expect(results).toEqual([
        expect.objectContaining({
          status: 'error',
          evaluator: expect.objectContaining({ name: 'latency' }),
          error: {
            message:
              'Evaluator "latency" reads its metric from the trace, so it cannot grade in-memory evidence',
          },
        }),
        expect.objectContaining({
          status: 'ok',
          evaluator: expect.objectContaining({ name: 'groundedness' }),
        }),
      ]);
      expect(traceReader.search).not.toHaveBeenCalled();
    });

    it('gives each evaluator the part of the reference data its schema reads', async () => {
      const treeCoverage: EvaluatorDefinition = {
        ...buildEvaluator({ name: 'tree_coverage' }),
        referenceDataSchema: z.object({
          decision_tree: z.string().min(1),
          transcript: z.array(z.object({ role: z.string(), content: z.string() })),
        }),
      };
      const conclusionQuality = buildEvaluator({ name: 'conclusion_quality' });
      const { evaluateEvidence } = setup([treeCoverage, conclusionQuality]);
      const transcript = [
        { role: 'user', content: 'Why did the checkout alert fire?' },
        { role: 'assistant', content: 'A bad deploy of the payments service.' },
      ];
      const referenceData = { decision_tree: 'graph TD; A-->B', transcript, verified_cause: 'x' };

      await evaluateEvidence({
        evaluators: [{ name: 'tree_coverage' }, { name: 'conclusion_quality' }],
        evidence: { round: EVIDENCE_ROUND, referenceData },
      });

      const [treeCoverageContext] = (treeCoverage.evaluate as jest.Mock).mock.calls[0];
      expect(treeCoverageContext.referenceData).toEqual({
        decision_tree: 'graph TD; A-->B',
        transcript,
      });
      const [conclusionQualityContext] = (conclusionQuality.evaluate as jest.Mock).mock.calls[0];
      expect(conclusionQualityContext.referenceData).toEqual(referenceData);
    });

    it('validates reference data against the evaluator schema', async () => {
      const correctness: EvaluatorDefinition = {
        ...buildEvaluator({ name: 'correctness' }),
        referenceDataSchema: z.object({ expected: z.string().min(1) }),
      };
      const { evaluateEvidence } = setup([correctness]);

      await expect(
        evaluateEvidence({
          evaluators: [{ name: 'correctness' }],
          evidence: { round: EVIDENCE_ROUND },
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining('Invalid reference_data for evaluator "correctness"'),
        responseType: 'badRequest',
      });
      expect(correctness.evaluate).not.toHaveBeenCalled();
    });
  });
});
