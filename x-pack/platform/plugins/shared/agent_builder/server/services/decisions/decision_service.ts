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
import { createEisDecisionProvider } from './providers/eis';
import { createFastModelDecisionProvider } from './providers/fast_model';
import { createOpenRouterDecisionProvider } from './providers/openrouter';
import type {
  DecisionProvider,
  DecisionProviderId,
  DecisionProviderResult,
} from './providers/types';
import { isDecisionProviderUnavailableError } from './providers/types';

/**
 * The decision providers, in the order they are tried: OpenRouter when configured (temporary),
 * the Elasticsearch `decision` task (EIS), then Agent Builder's fast model as the fallback.
 */
export const createDecisionProviders = ({
  config,
  elasticsearch,
  createModelProvider,
}: {
  config: AgentBuilderConfig['decisionModel'];
  elasticsearch: ElasticsearchServiceStart;
  createModelProvider: ModelProviderFactoryFn;
}): DecisionProvider[] => [
  ...(config.openRouter ? [createOpenRouterDecisionProvider(config.openRouter)] : []),
  createEisDecisionProvider({ elasticsearch, inferenceId: config.inferenceId }),
  createFastModelDecisionProvider({ createModelProvider, timeoutMs: config.fastModelTimeoutMs }),
];

/** Runs one provider with its own timeout, also aborted when the caller aborts. */
const attempt = async ({
  provider,
  params: { request, input, questions },
  timeoutMs,
  abortSignal,
}: {
  provider: DecisionProvider;
  params: DecideParams;
  timeoutMs: number;
  abortSignal?: AbortSignal;
}): Promise<{ result: DecisionProviderResult } | { error: Error; timedOut: boolean }> => {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  let timer: ReturnType<typeof setTimeout> | undefined;

  abortSignal?.addEventListener('abort', onAbort, { once: true });

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Decision provider [${provider.id}] timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    controller.signal.addEventListener('abort', () =>
      reject(new Error(`Decision provider [${provider.id}] aborted`))
    );
  });

  try {
    const result = await Promise.race([
      provider.decide({ request, input, questions, signal: controller.signal }),
      deadline,
    ]);

    return { result };
  } catch (error) {
    return { error, timedOut: controller.signal.aborted };
  } finally {
    clearTimeout(timer);
    abortSignal?.removeEventListener('abort', onAbort);
  }
};

/**
 * Creates the decision service. It tries the providers in order, giving each its own timeout
 * (else `timeoutMs`), and
 * moves on when one fails. A provider that reports it can never answer is skipped until Kibana
 * restarts.
 */
export const createDecisionService = ({
  logger,
  providers,
  timeoutMs: defaultTimeoutMs,
}: {
  logger: Logger;
  providers: DecisionProvider[];
  timeoutMs: number;
}): DecisionsStart => {
  const unavailable = new Set<DecisionProviderId>();

  const decide = async (params: DecideParams): Promise<DecideResult> => {
    const { abortSignal, timeoutMs = defaultTimeoutMs, questions } = params;
    const questionNames = Object.keys(questions).join(', ');
    let lastError: Error | undefined;

    for (const provider of providers) {
      if (abortSignal?.aborted) {
        return { status: 'failed', error: new Error('Decision aborted') };
      }

      if (unavailable.has(provider.id)) {
        continue;
      }

      const startedAt = Date.now();
      const outcome = await attempt({
        provider,
        params,
        timeoutMs: provider.timeoutMs ?? timeoutMs,
        abortSignal,
      });
      const elapsed = Date.now() - startedAt;

      if ('result' in outcome) {
        const { inferenceId, answers } = outcome.result;

        logger.debug(
          () =>
            `Decision [${questionNames}] from [${
              provider.id
            }:${inferenceId}] in ${elapsed}ms: ${JSON.stringify(answers)}`
        );

        return { status: 'decided', inferenceId, answers };
      }

      const { error, timedOut } = outcome;

      if (isDecisionProviderUnavailableError(error)) {
        unavailable.add(provider.id);
        logger.debug(
          `Decision provider [${provider.id}] is unavailable until Kibana restarts: ${error.message}`
        );
        continue;
      }

      lastError = error;

      const message = `Decision [${questionNames}] failed on [${provider.id}] after ${elapsed}ms: ${error.message}`;

      // A timeout or abort is expected under load; anything else may mean a misconfiguration.
      if (timedOut) {
        logger.debug(message);
      } else {
        logger.warn(message);
      }
    }

    if (abortSignal?.aborted) {
      return { status: 'failed', error: new Error('Decision aborted') };
    }

    return lastError ? { status: 'failed', error: lastError } : { status: 'unavailable' };
  };

  return {
    decide: (params) =>
      withActiveInferenceSpan(
        'decide',
        { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
        () => decide(params)
      ),
  };
};
