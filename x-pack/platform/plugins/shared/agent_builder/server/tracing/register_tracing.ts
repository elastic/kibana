/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { buildOtelResources } from '@kbn/telemetry';
import {
  ElasticsearchOtlpExporter,
  LateBindingSpanProcessor,
  EvalSpanProcessor,
} from '@kbn/tracing';
import {
  initInferenceTracerProvider,
  shutdownInferenceTracerProvider,
  EXECUTION_ID_BAGGAGE_KEY,
  EVAL_EXPERIMENT_ID_BAGGAGE_KEY,
  EVALUATOR_NAME_BAGGAGE_KEY,
} from '@kbn/inference-tracing';
import {
  AGENT_BUILDER_TRACING_ENABLED_SETTING_ID,
  AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID,
  AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID,
  AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID,
  AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID,
  AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID,
  AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID,
  AGENT_BUILDER_TRACING_USER_DATA_SETTING_ID,
} from '@kbn/management-settings-ids';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import type { TracingPrivacySettings } from './agent_builder_span_processor';
import type { AgentBuilderConfig } from '../config';
import { AgentBuilderSpanProcessor } from './agent_builder_span_processor';
import { GlobalBridgeProcessor } from './global_bridge_processor';
import { OpikDistributedTracingSpanProcessor } from './opik_distributed_tracing';
import { DATA_STREAM_NAMESPACE_ATTR, SPACE_ID_BAGGAGE_KEY } from './agent_builder_context';

const DISABLED_TRACING_SETTINGS: TracingPrivacySettings = {
  enabled: false,
  includeUserPrompts: false,
  includeLlmResponses: false,
  includeToolDetails: false,
  includeSystemPrompt: false,
  includeRealNames: false,
  includeRealIds: false,
  includeUserData: false,
};

/**
 * Loads tracing privacy uiSettings for the span's space on demand.
 */
const createTracingSettingsLoader = (
  core: CoreStart,
  logger: Logger
): { getSettings: (spaceId?: string) => Promise<TracingPrivacySettings> } => {
  const internalClient = core.savedObjects.getUnsafeInternalClient();

  return {
    getSettings: async (spaceId = 'default') => {
      const namespace = spaceId || 'default';
      try {
        const soClient = internalClient.asScopedToNamespace(namespace);
        const client = core.uiSettings.asScopedToClient(soClient);
        const [
          enabled,
          includeUserPrompts,
          includeLlmResponses,
          includeToolDetails,
          includeSystemPrompt,
          includeRealNames,
          includeRealIds,
          includeUserData,
        ] = await Promise.all([
          client.get<boolean>(AGENT_BUILDER_TRACING_ENABLED_SETTING_ID),
          client.get<boolean>(AGENT_BUILDER_TRACING_USER_PROMPTS_SETTING_ID),
          client.get<boolean>(AGENT_BUILDER_TRACING_LLM_RESPONSES_SETTING_ID),
          client.get<boolean>(AGENT_BUILDER_TRACING_TOOL_DETAILS_SETTING_ID),
          client.get<boolean>(AGENT_BUILDER_TRACING_SYSTEM_PROMPT_SETTING_ID),
          client.get<boolean>(AGENT_BUILDER_TRACING_REAL_NAMES_SETTING_ID),
          client.get<boolean>(AGENT_BUILDER_TRACING_REAL_IDS_SETTING_ID),
          client.get<boolean>(AGENT_BUILDER_TRACING_USER_DATA_SETTING_ID),
        ]);
        return {
          enabled,
          includeUserPrompts,
          includeLlmResponses,
          includeToolDetails,
          includeSystemPrompt,
          includeRealNames,
          includeRealIds,
          includeUserData,
        };
      } catch (error) {
        logger.error(`Failed to fetch tracing settings for space [${namespace}]: ${error.message}`);
        return DISABLED_TRACING_SETTINGS;
      }
    },
  };
};

export const registerTracingExporter = async ({
  core,
  tracingConfig,
  logger,
}: {
  core: CoreStart;
  tracingConfig: AgentBuilderConfig['tracing'];
  logger: Logger;
}): Promise<(() => Promise<void>) | undefined> => {
  const { getSettings } = createTracingSettingsLoader(core, logger);

  // Always include the ES exporter so enabling the uiSetting takes effect on
  // the next span without a server restart.
  const allExporters: tracing.SpanExporter[] = [
    new ElasticsearchOtlpExporter(core.elasticsearch.client.asInternalUser),
    ...tracingConfig.exporters.map(
      ({ url, headers }) =>
        new OTLPTraceExporter({
          url,
          ...(headers ? { headers } : {}),
        })
    ),
  ];

  const processors: tracing.SpanProcessor[] = [
    ...(tracingConfig.opik_distributed_tracing ? [new OpikDistributedTracingSpanProcessor()] : []),
    ...allExporters.map(
      (exporter) =>
        new AgentBuilderSpanProcessor({
          exporter,
          scheduledDelayMillis: tracingConfig.scheduledDelay,
          getSettings,
        })
    ),
  ];

  processors.push(
    new EvalSpanProcessor([
      { baggageKey: EXECUTION_ID_BAGGAGE_KEY },
      { baggageKey: EVAL_EXPERIMENT_ID_BAGGAGE_KEY },
      { baggageKey: EVALUATOR_NAME_BAGGAGE_KEY, attributeKey: 'evaluator.name' },
      { baggageKey: SPACE_ID_BAGGAGE_KEY, attributeKey: DATA_STREAM_NAMESPACE_ATTR },
    ])
  );

  const lateBindingProcessor = LateBindingSpanProcessor.get();
  if (lateBindingProcessor) {
    processors.push(new GlobalBridgeProcessor(lateBindingProcessor));
  }

  const resource = buildOtelResources();
  await resource.waitForAsyncAttributes?.();

  initInferenceTracerProvider({
    processors,
    resource,
  });

  return async () => {
    await shutdownInferenceTracerProvider();
  };
};
