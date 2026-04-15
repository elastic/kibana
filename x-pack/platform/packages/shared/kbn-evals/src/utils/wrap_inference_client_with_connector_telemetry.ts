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

function getTelemetryPluginId(): string | undefined {
  const raw = process.env.KBN_EVALS_TELEMETRY_PLUGIN_ID;
  if (raw == null) return 'kbn_evals';
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : 'kbn_evals';
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
  const pluginId = getTelemetryPluginId();
  return pluginId ? withConnectorTelemetry(client, { pluginId }) : client;
}
