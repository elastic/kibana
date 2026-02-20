/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoundChatCompleteAPI,
  BoundInferenceClient,
  BoundPromptAPI,
  ChatCompleteMetadata,
  ConnectorTelemetryMetadata,
  Prompt,
  UnboundChatCompleteOptions,
  UnboundPromptOptions,
} from '@kbn/inference-common';

function normalizeProductUseCasePart(raw: string): string | undefined {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized.length > 0 ? normalized : undefined;
}

function getEisProductUseCase(): string | undefined {
  // `EVAL_SUITE_ID` is required for CI runs (see `.buildkite/scripts/steps/evals/run_suite.sh`)
  // and is a good default "prefix" for eval suites that can live anywhere in the repo.
  const rawPrefix = process.env.KBN_EVALS_TELEMETRY_PREFIX ?? process.env.EVAL_SUITE_ID;

  // Allow a CI pipeline to add a suffix to distinguish eval traffic from interactive usage.
  const rawSuffix = process.env.KBN_EVALS_TELEMETRY_SUFFIX;

  const prefix = rawPrefix ? normalizeProductUseCasePart(rawPrefix) : undefined;
  const suffix = rawSuffix ? normalizeProductUseCasePart(rawSuffix) : undefined;

  if (!prefix) return undefined;
  if (!suffix || suffix === prefix) return prefix;
  return `${prefix}_${suffix}`;
}

function withConnectorTelemetry(
  client: BoundInferenceClient,
  connectorTelemetry: ConnectorTelemetryMetadata
): BoundInferenceClient {
  const withMetadata = (metadata: ChatCompleteMetadata | undefined): ChatCompleteMetadata => ({
    ...(metadata ?? {}),
    connectorTelemetry: {
      ...(metadata?.connectorTelemetry ?? {}),
      ...connectorTelemetry,
      pluginId: metadata?.connectorTelemetry?.pluginId ?? connectorTelemetry.pluginId,
    },
  });

  return {
    ...client,
    bindTo: (options) => withConnectorTelemetry(client.bindTo(options), connectorTelemetry),
    chatComplete: (<TChatCompleteOptions extends UnboundChatCompleteOptions>(
      options: TChatCompleteOptions
    ) => {
      return client.chatComplete({
        ...options,
        metadata: withMetadata(options.metadata),
      });
    }) as BoundChatCompleteAPI,
    prompt: (<TPrompt extends Prompt, TPromptOptions extends UnboundPromptOptions<TPrompt>>(
      options: { prompt: TPrompt } & TPromptOptions
    ) => {
      return client.prompt({
        ...options,
        metadata: withMetadata(options.metadata),
      });
    }) as BoundPromptAPI,
  };
}

export function wrapInferenceClientWithEisConnectorTelemetry(
  client: BoundInferenceClient
): BoundInferenceClient {
  const productUseCase = getEisProductUseCase();
  return productUseCase ? withConnectorTelemetry(client, { pluginId: productUseCase }) : client;
}
