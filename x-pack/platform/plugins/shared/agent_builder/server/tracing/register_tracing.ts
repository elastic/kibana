/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { tracing } from '@elastic/opentelemetry-node/sdk';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
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

const SETTING_CACHE_TTL_MS = 30_000;
const SPACE_FIND_PAGE_SIZE = 10_000;

const SCHEMA_DEFAULT_SETTINGS: TracingPrivacySettings = {
  enabled: true,
  includeUserPrompts: false,
  includeLlmResponses: false,
  includeToolDetails: false,
  includeSystemPrompt: false,
  includeRealNames: false,
  includeRealIds: false,
  includeUserData: false,
};

const fetchSettingsForClient = async (
  client: IUiSettingsClient
): Promise<TracingPrivacySettings> => {
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
};

/**
 * Returns a synchronous `getSettings(spaceId)` function that polls tracing privacy
 * uiSettings for every space on a fixed interval. The span processor hot-path
 * requires synchronous access, so we refresh in the background every
 * {@link SETTING_CACHE_TTL_MS} ms.
 */
const createCachedTracingSettings = async (
  core: CoreStart,
  logger: Logger
): Promise<{
  getSettings: (spaceId?: string) => TracingPrivacySettings;
  stopPolling: () => void;
}> => {
  let settingsBySpace = new Map<string, TracingPrivacySettings>();

  const internalSoClient = core.savedObjects.getUnsafeInternalClient({
    includedHiddenTypes: ['space'],
  });

  const refresh = async () => {
    try {
      const { saved_objects: spaces } = await internalSoClient.find({
        type: 'space',
        page: 1,
        perPage: SPACE_FIND_PAGE_SIZE,
      });
      const spaceIds = [...new Set([DEFAULT_SPACE_ID, ...spaces.map((space) => space.id)])];

      const entries = await Promise.all(
        spaceIds.map(async (spaceId) => {
          try {
            const scopedSoClient = internalSoClient.asScopedToNamespace(spaceId);
            const client = core.uiSettings.asScopedToClient(scopedSoClient);
            return [spaceId, await fetchSettingsForClient(client)] as const;
          } catch (error) {
            logger.error(
              `Failed to fetch tracing settings for space [${spaceId}]: ${error.message}`
            );
            return [spaceId, settingsBySpace.get(spaceId) ?? SCHEMA_DEFAULT_SETTINGS] as const;
          }
        })
      );
      settingsBySpace = new Map(entries);
    } catch (error) {
      logger.error(`Failed to fetch tracing settings: ${error.message}`);
    }
  };

  await refresh();
  const intervalId = setInterval(refresh, SETTING_CACHE_TTL_MS);

  return {
    getSettings: (spaceId?: string) =>
      settingsBySpace.get(spaceId ?? DEFAULT_SPACE_ID) ?? SCHEMA_DEFAULT_SETTINGS,
    stopPolling: () => clearInterval(intervalId),
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
  const { getSettings, stopPolling } = await createCachedTracingSettings(core, logger);

  // Always include the ES exporter so that enabling the uiSetting takes effect
  // within the next polling cycle, without requiring a server restart.
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
    stopPolling();
    await shutdownInferenceTracerProvider();
  };
};
