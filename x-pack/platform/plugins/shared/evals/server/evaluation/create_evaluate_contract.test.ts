/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { createEvaluateContract } from './create_evaluate_contract';
import { EvaluationExecutionError } from './evaluation_execution_error';
import type { EvaluationService } from './evaluation_service';

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

describe('createEvaluateContract', () => {
  const request = {} as KibanaRequest;
  const traceReader = { search: jest.fn() } as unknown as ElasticsearchClient;

  const setup = () => {
    const evaluationService: jest.Mocked<EvaluationService> = {
      evaluate: jest.fn().mockResolvedValue([]),
    };
    const getSpaceId = jest.fn().mockReturnValue('request-space');
    const getTraceReader = jest.fn().mockReturnValue(traceReader);
    const evaluate = createEvaluateContract({ evaluationService, getSpaceId, getTraceReader });

    return { evaluate, evaluationService, getSpaceId, getTraceReader };
  };

  it("evaluates in the request's space, reading traces as the request", async () => {
    const { evaluate, evaluationService, getSpaceId, getTraceReader } = setup();

    await evaluate({
      request,
      subject: { traces: [{ trace_id: TRACE_ID }] },
      evaluators: [{ name: 'groundedness', connector_id: 'judge-connector' }],
    });

    expect(getSpaceId).toHaveBeenCalledWith(request);
    expect(getTraceReader).toHaveBeenCalledWith(request);
    expect(evaluationService.evaluate).toHaveBeenCalledWith({
      request,
      spaceId: 'request-space',
      subject: { mode: 'single-turn', traces: [{ trace_id: TRACE_ID }] },
      evaluators: [{ name: 'groundedness', connector_id: 'judge-connector' }],
      traceReader,
    });
  });

  it('uses an explicit space over the request space', async () => {
    const { evaluate, evaluationService, getSpaceId } = setup();

    await evaluate({
      request,
      spaceId: 'payments',
      subject: { traces: [{ trace_id: TRACE_ID }] },
      evaluators: [{ name: 'latency' }],
    });

    expect(getSpaceId).not.toHaveBeenCalled();
    expect(evaluationService.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 'payments' })
    );
  });

  it.each([
    ['an invalid trace id', { traces: [{ trace_id: 'trace-1' }] }, [{ name: 'latency' }]],
    ['no traces', { traces: [] }, [{ name: 'latency' }]],
    ['no evaluators', { traces: [{ trace_id: TRACE_ID }] }, []],
  ])('rejects %s with the bounds of an `_evaluate` request', async (_, subject, evaluators) => {
    const { evaluate, evaluationService } = setup();

    const evaluation = evaluate({ request, subject, evaluators });

    await expect(evaluation).rejects.toThrow(EvaluationExecutionError);
    await expect(evaluation).rejects.toMatchObject({
      message: expect.stringContaining('Invalid evaluation input'),
      responseType: 'badRequest',
    });
    expect(evaluationService.evaluate).not.toHaveBeenCalled();
  });

  describe('in-memory evidence', () => {
    const ROUND = {
      input: { message: 'Why did the checkout alert fire?' },
      response: { message: 'A bad deploy of the payments service.' },
      steps: [{ tool_id: 'search_logs', result: { hits: 12 } }],
    };

    it('passes the round and reference data through, without a trace reader', async () => {
      const { evaluate, evaluationService, getTraceReader } = setup();

      await evaluate({
        request,
        evaluators: [{ name: 'groundedness', connector_id: 'judge-connector' }],
        evidence: { round: ROUND, reference_data: { expected: 'A bad deploy' } },
      });

      expect(getTraceReader).not.toHaveBeenCalled();
      expect(evaluationService.evaluate).toHaveBeenCalledWith({
        request,
        spaceId: 'request-space',
        evaluators: [{ name: 'groundedness', connector_id: 'judge-connector' }],
        evidence: { round: ROUND, referenceData: { expected: 'A bad deploy' } },
      });
    });

    it('rejects a round missing the response', async () => {
      const { evaluate, evaluationService } = setup();

      const evaluation = evaluate({
        request,
        evaluators: [{ name: 'groundedness', connector_id: 'judge-connector' }],
        evidence: {
          round: { input: ROUND.input, steps: [] } as unknown as typeof ROUND,
        },
      });

      await expect(evaluation).rejects.toMatchObject({
        message: expect.stringContaining('Invalid evaluation input'),
        responseType: 'badRequest',
      });
      expect(evaluationService.evaluate).not.toHaveBeenCalled();
    });

    it('rejects a call that passes both a subject and evidence', async () => {
      const { evaluate, evaluationService } = setup();

      const evaluation = evaluate({
        request,
        evaluators: [{ name: 'groundedness', connector_id: 'judge-connector' }],
        subject: { traces: [{ trace_id: TRACE_ID }] },
        evidence: { round: ROUND },
      } as unknown as Parameters<typeof evaluate>[0]);

      await expect(evaluation).rejects.toMatchObject({
        message: 'Invalid evaluation input: pass either subject or evidence, not both',
        responseType: 'badRequest',
      });
      expect(evaluationService.evaluate).not.toHaveBeenCalled();
    });
  });
});
