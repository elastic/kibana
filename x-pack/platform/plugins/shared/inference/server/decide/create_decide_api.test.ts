/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { DecisionChoiceQuestion, DecisionPredicateQuestion } from '@kbn/inference-common';
import {
  InferenceTaskErrorCode,
  isInferenceProviderError,
  isInferenceRequestAbortedError,
  isInferenceRequestError,
} from '@kbn/inference-common';
import { decisionResponse } from './__fixtures__/decision_response';
import { decisionEndpoints } from './__fixtures__/decision_endpoints';
import { createDecideApi } from './create_decide_api';

const shouldRespond: DecisionPredicateQuestion = {
  type: 'predicate',
  instructions: 'Should the agent respond?',
};

const topic: DecisionChoiceQuestion = {
  type: 'choice',
  instructions: 'Pick one',
  choices: { a: 'A', b: 'B' },
};

const input = 'secret conversation text';

const responseError = (statusCode: number, reason: string) =>
  new errors.ResponseError({
    statusCode,
    body: { error: { type: 'error', reason } },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

const setup = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const decide = createDecideApi({ esClient, logger });

  return { decide, logger, transportRequest: esClient.transport.request };
};

describe('createDecideApi', () => {
  it('returns a single answer for one question, using the given inference id', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockResolvedValue(decisionResponse);

    const result = await decide({ input, inferenceId: 'my-decision' }, shouldRespond);

    expect(transportRequest).toHaveBeenCalledTimes(1);
    expect(transportRequest.mock.calls[0][0]).toEqual({
      method: 'POST',
      path: '/_inference/decision/my-decision',
      body: { input, task_settings: { questions: { question_1: shouldRespond } } },
    });
    expect(result).toEqual({
      inferenceId: 'my-decision',
      answer: { type: 'predicate', probability: 0.94 },
    });

    const probability: number = result.answer.probability;
    expect(probability).toBe(0.94);
  });

  it('returns the answers in the order of the questions', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockResolvedValue(decisionResponse);

    const { answers } = await decide({ input, inferenceId: 'my-decision' }, shouldRespond, topic);
    const [{ probability }, { choice }] = answers;

    expect([probability, choice]).toEqual([0.94, 'a']);
    expect(transportRequest.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        body: {
          input,
          task_settings: { questions: { question_1: shouldRespond, question_2: topic } },
        },
      })
    );
  });

  it('uses the first decision endpoint the cluster lists when no inference id is given', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockImplementation(async ({ method }) =>
      method === 'GET' ? decisionEndpoints : decisionResponse
    );

    const { inferenceId } = await decide({ input }, shouldRespond);

    expect(transportRequest.mock.calls[0][0]).toEqual({
      method: 'GET',
      path: '/_inference/decision/_all',
    });
    expect(inferenceId).toBe('.jev-1.13-decision');
  });

  it('rejects a call without questions', async () => {
    const { decide, transportRequest } = setup();

    const error = await Reflect.apply(decide, undefined, [{ input }]).catch(
      (thrown: Error) => thrown
    );

    expect(isInferenceRequestError(error)).toBe(true);
    expect(error.message).toContain('at least one question');
    expect(transportRequest).not.toHaveBeenCalled();
  });

  it('throws a 404 request error when the cluster lists no decision endpoint', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockResolvedValue({ endpoints: [] });

    const error = await decide({ input }, shouldRespond).catch((thrown) => thrown);

    expect(isInferenceRequestError(error)).toBe(true);
    expect(error.meta.status).toBe(404);
  });

  it('throws a 404 request error when the endpoint does not exist', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockRejectedValue(responseError(404, 'Inference endpoint not found'));

    const error = await decide({ input, inferenceId: 'missing' }, shouldRespond).catch(
      (thrown) => thrown
    );

    expect(isInferenceRequestError(error)).toBe(true);
    expect(error.meta.status).toBe(404);
  });

  it('throws a 404 request error when Elasticsearch does not know the decision task type', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockRejectedValue(responseError(400, 'Unknown task_type [decision]'));

    const error = await decide({ input }, shouldRespond).catch((thrown) => thrown);

    expect(isInferenceRequestError(error)).toBe(true);
    expect(error.meta.status).toBe(404);
  });

  it('throws other Elasticsearch errors as provider errors with their status', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockRejectedValue(responseError(503, 'overloaded'));

    const error = await decide({ input, inferenceId: 'my-decision' }, shouldRespond).catch(
      (thrown) => thrown
    );

    expect(isInferenceProviderError(error)).toBe(true);
    expect(error.meta.status).toBe(503);
  });

  it('throws a provider error when an answer does not match its question type', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockResolvedValue(decisionResponse);

    const error = await decide({ input, inferenceId: 'my-decision' }, topic).catch(
      (thrown) => thrown
    );

    expect(error.code).toBe(InferenceTaskErrorCode.providerError);
    expect(error.message).toBe(
      'Decision answer [question_1] has type [predicate], expected [choice]'
    );
  });

  it('throws an aborted error without calling Elasticsearch when already aborted', async () => {
    const { decide, transportRequest } = setup();
    const controller = new AbortController();

    controller.abort();

    const error = await decide(
      { input, inferenceId: 'my-decision', abortSignal: controller.signal },
      shouldRespond
    ).catch((thrown) => thrown);

    expect(isInferenceRequestAbortedError(error)).toBe(true);
    expect(transportRequest).not.toHaveBeenCalled();
  });

  it('passes the abort signal to Elasticsearch and throws an aborted error when it fires', async () => {
    const { decide, transportRequest } = setup();
    const controller = new AbortController();

    transportRequest.mockImplementation(async () => {
      controller.abort();
      throw new errors.RequestAbortedError('aborted');
    });

    const error = await decide(
      { input, inferenceId: 'my-decision', abortSignal: controller.signal },
      shouldRespond
    ).catch((thrown) => thrown);

    expect(transportRequest.mock.calls[0][1]).toEqual({ signal: controller.signal });
    expect(isInferenceRequestAbortedError(error)).toBe(true);
  });

  it('never logs the input text', async () => {
    const { decide, logger, transportRequest } = setup();

    transportRequest.mockResolvedValueOnce(decisionResponse);
    await decide({ input, inferenceId: 'my-decision' }, shouldRespond);

    transportRequest.mockRejectedValueOnce(responseError(503, 'overloaded'));
    await decide({ input, inferenceId: 'my-decision' }, shouldRespond).catch(() => {});

    const logged = JSON.stringify(
      [...logger.debug.mock.calls, ...logger.info.mock.calls, ...logger.warn.mock.calls].map(
        ([message]) => (typeof message === 'function' ? message() : message)
      )
    );

    expect(logger.debug).toHaveBeenCalled();
    expect(logged).not.toContain(input);
  });
});
