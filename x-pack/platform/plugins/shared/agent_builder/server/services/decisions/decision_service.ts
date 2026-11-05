/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type { DecideParams, DecideResult, DecisionsStart } from '@kbn/agent-builder-server';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import type { AgentBuilderConfig } from '../../config';
import type { ModelProviderFactoryFn } from '../execution/runner/model_provider';
import { EisDecisionProvider } from './providers/eis';
import { FastModelDecisionProvider } from './providers/fast_model';
import type { DecisionProvider } from './providers/types';
import {
  isDecisionProviderAbortedError,
  isDecisionProviderUnavailableError,
} from './providers/types';

/**
 * The decision providers, in the order they are tried: the Elasticsearch `decision` task (EIS),
 * then Agent Builder's fast model as the fallback.
 */
export const createDecisionProviders = ({
  config: { inferenceId, fastModelTimeoutMs, unavailableTtlMs },
  elasticsearch,
  createModelProvider,
}: {
  config: AgentBuilderConfig['decisionModel'];
  elasticsearch: ElasticsearchServiceStart;
  createModelProvider: ModelProviderFactoryFn;
}): DecisionProvider[] => [
  new EisDecisionProvider({ elasticsearch, inferenceId, unavailableTtlMs }),
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
  private readonly timeoutMs: number;

  constructor({
    logger,
    providers,
    timeoutMs,
  }: {
    logger: Logger;
    providers: DecisionProvider[];
    /** The timeout of providers without their own. */
    timeoutMs: number;
  }) {
    this.logger = logger;
    this.providers = providers;
    this.timeoutMs = timeoutMs;
  }

  decide = (params: DecideParams): Promise<DecideResult> =>
    withActiveInferenceSpan(
      'decide',
      { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
      () => this.run(params)
    );

  private async run({
    request,
    input,
    questions,
    abortSignal,
    timeoutMs = this.timeoutMs,
  }: DecideParams): Promise<DecideResult> {
    const questionNames = Object.keys(questions).join(', ');
    let lastError: Error | undefined;

    for (const provider of this.providers) {
      if (abortSignal?.aborted) {
        return { status: 'failed', error: new Error('Decision aborted') };
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
          timeoutMs,
          abortSignal,
        });

        this.logger.debug(
          () =>
            `Decision [${questionNames}] from [${provider.id}:${inferenceId}] in ${
              Date.now() - startedAt
            }ms: ${JSON.stringify(answers)}`
        );

        return { status: 'decided', inferenceId, answers };
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

        const message = `Decision [${questionNames}] failed on [${provider.id}] after ${
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
      return { status: 'failed', error: new Error('Decision aborted') };
    }

    return lastError ? { status: 'failed', error: lastError } : { status: 'unavailable' };
  }
}
