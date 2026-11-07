/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type {
  DecideParams,
  DecideResult,
  DecisionAnswer,
  DecisionAnswerFor,
  DecisionAnswersFor,
  DecisionQuestion,
  DecisionsStart,
} from '@kbn/agent-builder-server';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { AgentBuilderConfig } from '../../config';
import type { ModelProviderFactoryFn } from '../execution/runner/model_provider';
import { EisDecisionProvider } from './providers/eis';
import { FastModelDecisionProvider } from './providers/fast_model';
import type { DecisionProvider, DecisionProviderId } from './providers/types';
import {
  isDecisionProviderAbortedError,
  isDecisionProviderUnavailableError,
} from './providers/types';

/**
 * The decision providers, in the order they are tried: the Elasticsearch `decision` task (EIS),
 * then Agent Builder's fast model as the fallback.
 */
export const createDecisionProviders = ({
  config: { inferenceId, eisTimeoutMs, fastModelTimeoutMs, unavailableTtlMs },
  elasticsearch,
  createModelProvider,
}: {
  config: Pick<
    AgentBuilderConfig['decisionModel'],
    'inferenceId' | 'eisTimeoutMs' | 'fastModelTimeoutMs' | 'unavailableTtlMs'
  >;
  elasticsearch: ElasticsearchServiceStart;
  createModelProvider: ModelProviderFactoryFn;
}): DecisionProvider[] => [
  new EisDecisionProvider({
    elasticsearch,
    inferenceId,
    timeoutMs: eisTimeoutMs,
    unavailableTtlMs,
  }),
  new FastModelDecisionProvider({
    createModelProvider,
    timeoutMs: fastModelTimeoutMs,
    unavailableTtlMs,
  }),
];

/**
 * Tries the providers in order and moves on when one fails. A provider that reports it cannot
 * answer skips itself for a while, see {@link BaseDecisionProvider}.
 */
export class DecisionService implements DecisionsStart {
  private readonly logger: Logger;
  private readonly providers: DecisionProvider[];

  constructor({ logger, providers }: { logger: Logger; providers: DecisionProvider[] }) {
    this.logger = logger;
    this.providers = providers;
  }

  decide<const Q extends DecisionQuestion>(
    params: DecideParams,
    question: Q
  ): Promise<DecideResult<{ answer: DecisionAnswerFor<Q> }>>;
  decide<const Q extends [DecisionQuestion, DecisionQuestion, ...DecisionQuestion[]]>(
    params: DecideParams,
    ...questions: Q
  ): Promise<DecideResult<{ answers: DecisionAnswersFor<Q> }>>;
  /** Runs the provider chain in a `decide` span that records which provider answered. */
  decide(
    params: DecideParams,
    ...questions: DecisionQuestion[]
  ): Promise<DecideResult<{ answer: DecisionAnswer } | { answers: DecisionAnswer[] }>> {
    if (questions.length === 0) {
      throw new Error('decide() needs at least one question');
    }

    return withActiveInferenceSpan(
      'decide',
      { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
      async (
        span
      ): Promise<DecideResult<{ answer: DecisionAnswer } | { answers: DecisionAnswer[] }>> => {
        const { result, providerId } = await this.run(params, questions);

        span?.setAttributes({
          'elastic.decision.status': result.status,
          ...(result.status === 'decided'
            ? {
                'elastic.decision.provider': providerId,
                'elastic.decision.inference_id': result.inferenceId,
              }
            : {}),
        });

        if (result.status !== 'decided') {
          return result;
        }

        const { inferenceId, answers } = result;

        return questions.length === 1
          ? { status: 'decided', inferenceId, answer: answers[0] }
          : { status: 'decided', inferenceId, answers };
      }
    );
  }

  private async run(
    { request, input, abortSignal }: DecideParams,
    questions: DecisionQuestion[]
  ): Promise<{
    result: DecideResult<{ answers: DecisionAnswer[] }>;
    providerId?: DecisionProviderId;
  }> {
    const questionTypes = questions.map(({ type }) => type).join(', ');
    let lastError: Error | undefined;

    for (const provider of this.providers) {
      if (abortSignal?.aborted) {
        return { result: { status: 'failed', error: new Error('Decision aborted') } };
      }

      if (!provider.isAvailable()) {
        continue;
      }

      const startedAt = Date.now();

      try {
        const { inferenceId, answers } = await provider.decide({
          request,
          input,
          questions,
          abortSignal,
        });

        this.logger.debug(
          () =>
            `Decision [${questionTypes}] from [${provider.id}:${inferenceId}] in ${
              Date.now() - startedAt
            }ms: ${JSON.stringify(answers)}`
        );

        return { result: { status: 'decided', inferenceId, answers }, providerId: provider.id };
      } catch (error) {
        if (isDecisionProviderUnavailableError(error)) {
          this.logger.debug(
            `Decision provider [${
              provider.id
            }] is unavailable until ${provider.unavailableUntil?.toISOString()}: ${error.message}`
          );
          continue;
        }

        lastError = error;

        const message = `Decision [${questionTypes}] failed on [${provider.id}] after ${
          Date.now() - startedAt
        }ms: ${error.message}`;

        // A timeout or abort is expected under load; anything else may mean a misconfiguration.
        if (isDecisionProviderAbortedError(error)) {
          this.logger.debug(message);
        } else {
          this.logger.warn(message);
        }
      }
    }

    if (abortSignal?.aborted) {
      return { result: { status: 'failed', error: new Error('Decision aborted') } };
    }

    return {
      result: lastError ? { status: 'failed', error: lastError } : { status: 'unavailable' },
    };
  }
}
