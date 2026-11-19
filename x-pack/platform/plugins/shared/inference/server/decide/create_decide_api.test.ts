/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type {
  DecisionAnswer,
  DecisionChoiceQuestion,
  DecisionPredicateQuestion,
  DecisionQuestion,
} from '@kbn/inference-common';
import {
  InferenceTaskErrorCode,
  isInferenceProviderError,
  isInferenceRequestAbortedError,
  isInferenceRequestError,
} from '@kbn/inference-common';
import type { AnonymizationRule } from '@kbn/ai-anonymization-common';
import { executeRegexRulesTask } from '@kbn/ai-anonymization-server';
import { createRegexWorkerServiceMock } from '../test_utils';
import { decisionResponse } from './__fixtures__/decision_response';
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

const emailRule: AnonymizationRule = {
  type: 'RegExp',
  entityClass: 'EMAIL',
  pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
  enabled: true,
};

const setup = ({ anonymizationRules = [] }: { anonymizationRules?: AnonymizationRule[] } = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const regexWorker = createRegexWorkerServiceMock();

  jest
    .mocked(regexWorker.run)
    .mockImplementation(async (payload) => executeRegexRulesTask(payload));

  const decide = createDecideApi({
    esClient,
    logger,
    anonymizationRulesPromise: Promise.resolve(anonymizationRules),
    regexWorker,
  });

  return { decide, logger, regexWorker, transportRequest: esClient.transport.request };
};

describe('createDecideApi', () => {
  it('returns the answer to one question, using the given inference id', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockResolvedValue(decisionResponse);

    const {
      answers: [answer],
    } = await decide({ input, inferenceId: 'my-decision' }, shouldRespond);

    expect(transportRequest).toHaveBeenCalledTimes(1);
    expect(transportRequest.mock.calls[0][0]).toEqual({
      method: 'POST',
      path: '/_inference/decision/my-decision',
      body: { input, task_settings: { questions: { question_1: shouldRespond } } },
    });
    expect(answer).toEqual({ type: 'predicate', probability: 0.94 });

    const probability: number = answer.probability;
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

  it('sends the inference use case header by default', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockResolvedValue(decisionResponse);

    await decide({ input, inferenceId: 'my-decision' }, shouldRespond);

    expect(transportRequest.mock.calls[0][1]).toEqual(
      expect.objectContaining({ headers: { 'X-Elastic-Product-Use-Case': 'inference' } })
    );
  });

  it('sends the attribution headers the caller passes', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockResolvedValue(decisionResponse);

    await decide(
      {
        input,
        inferenceId: 'my-decision',
        metadata: { connectorTelemetry: { pluginId: 'agent_builder', productFeature: 'triggers' } },
      },
      shouldRespond
    );

    expect(transportRequest.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        headers: {
          'X-Elastic-Product-Use-Case': 'agent_builder',
          'X-Elastic-Product-Feature': 'triggers',
        },
      })
    );
  });

  it('accepts a list of questions built at runtime', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockResolvedValue(decisionResponse);

    const [first, ...rest]: DecisionQuestion[] = [shouldRespond, topic];
    const { answers } = await decide({ input, inferenceId: 'my-decision' }, first, ...rest);

    const [{ type }]: [DecisionAnswer, ...DecisionAnswer[]] = answers;

    expect(type).toBe('predicate');
    expect(answers).toHaveLength(2);
  });

  it('rejects a call without questions', async () => {
    const { decide, transportRequest } = setup();

    const error = await Reflect.apply(decide, undefined, [
      { input, inferenceId: 'my-decision' },
    ]).catch((thrown: Error) => thrown);

    expect(isInferenceRequestError(error)).toBe(true);
    expect(error.message).toContain('at least one question');
    expect(transportRequest).not.toHaveBeenCalled();
  });

  it('throws a 404 request error when the endpoint does not exist', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockRejectedValue(responseError(404, 'Inference endpoint not found'));

    const error = await decide({ input, inferenceId: 'missing' }, shouldRespond).catch(
      (thrown) => thrown
    );

    expect(isInferenceRequestError(error)).toBe(true);
    expect(error.meta.status).toBe(404);
    expect(error.message).toBe("Inference endpoint 'missing' not found");
  });

  it('keeps a 400 for an endpoint with another task type', async () => {
    const { decide, transportRequest } = setup();

    transportRequest.mockRejectedValue(
      responseError(400, 'Incompatible task_type, the requested type [decision] does not match')
    );

    const error = await decide({ input, inferenceId: 'my-chat-model' }, shouldRespond).catch(
      (thrown) => thrown
    );

    expect(isInferenceRequestError(error)).toBe(false);
    expect(isInferenceProviderError(error)).toBe(true);
    expect(error.meta.status).toBe(400);
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

  it('throws an aborted error without masking or calling Elasticsearch when already aborted', async () => {
    const { decide, regexWorker, transportRequest } = setup({ anonymizationRules: [emailRule] });
    const controller = new AbortController();

    controller.abort();

    const error = await decide(
      { input, inferenceId: 'my-decision', abortSignal: controller.signal },
      shouldRespond
    ).catch((thrown) => thrown);

    expect(isInferenceRequestAbortedError(error)).toBe(true);
    expect(regexWorker.run).not.toHaveBeenCalled();
    expect(transportRequest).not.toHaveBeenCalled();
  });

  it('does not call Elasticsearch when aborted while the input is masked', async () => {
    const { decide, regexWorker, transportRequest } = setup({ anonymizationRules: [emailRule] });
    const controller = new AbortController();

    jest.mocked(regexWorker.run).mockImplementation(async (payload) => {
      controller.abort();
      return executeRegexRulesTask(payload);
    });

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

    expect(transportRequest.mock.calls[0][1]).toEqual(
      expect.objectContaining({ signal: controller.signal })
    );
    expect(isInferenceRequestAbortedError(error)).toBe(true);
  });

  it('masks the input with the anonymization rules before sending it', async () => {
    const { decide, transportRequest } = setup({ anonymizationRules: [emailRule] });

    transportRequest.mockResolvedValue(decisionResponse);

    await decide(
      { input: 'Ask claudia@example.com about checkout', inferenceId: 'my-decision' },
      shouldRespond
    );

    expect(transportRequest.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        body: expect.objectContaining({
          input: expect.stringMatching(/^Ask EMAIL_\w+ about checkout$/),
        }),
      })
    );
  });

  it('masks the question text, keeping choice keys and level labels', async () => {
    const { decide, transportRequest } = setup({ anonymizationRules: [emailRule] });

    transportRequest.mockResolvedValue(decisionResponse);

    await decide(
      { input, inferenceId: 'my-decision' },
      { type: 'predicate', instructions: 'Is this from a@example.com?' },
      {
        type: 'choice',
        instructions: 'Who owns b@example.com?',
        choices: { a: 'The team of c@example.com', b: 'Nobody' },
      },
      {
        type: 'score',
        instructions: 'How urgent is it for d@example.com?',
        levels: [
          { label: 'low', description: 'e@example.com can wait' },
          { label: 'medium', description: 'Soon' },
          { label: 'high', description: 'Now' },
        ],
      }
    );

    expect(transportRequest.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        body: {
          input,
          task_settings: {
            questions: {
              question_1: {
                type: 'predicate',
                instructions: expect.stringMatching(/^Is this from EMAIL_\w+\?$/),
              },
              question_2: {
                type: 'choice',
                instructions: expect.stringMatching(/^Who owns EMAIL_\w+\?$/),
                choices: { a: expect.stringMatching(/^The team of EMAIL_\w+$/), b: 'Nobody' },
              },
              question_3: {
                type: 'score',
                instructions: expect.stringMatching(/^How urgent is it for EMAIL_\w+\?$/),
                levels: [
                  { label: 'low', description: expect.stringMatching(/^EMAIL_\w+ can wait$/) },
                  { label: 'medium', description: 'Soon' },
                  { label: 'high', description: 'Now' },
                ],
              },
            },
          },
        },
      })
    );
  });

  it('does not send the input when anonymization fails', async () => {
    const { decide, regexWorker, transportRequest } = setup({ anonymizationRules: [emailRule] });

    jest.mocked(regexWorker.run).mockRejectedValue(new Error('regex failed'));

    await expect(
      decide({ input: 'Ask claudia@example.com', inferenceId: 'my-decision' }, shouldRespond)
    ).rejects.toThrow('regex failed');

    expect(transportRequest).not.toHaveBeenCalled();
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
