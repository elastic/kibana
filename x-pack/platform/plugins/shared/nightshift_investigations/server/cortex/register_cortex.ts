/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import { SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID } from '@kbn/significant-events-schema';
import { i18n } from '@kbn/i18n';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { CORTEX_AI_INDEX_DEST, CORTEX_AI_INDEX_ID } from '../../common/cortex';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../agents/investigation';
import { materializeCortex } from './materialize';
import { createLlmProposeCortexEdits, optimizeCortex } from './optimize';
import { createCortexPageStore, type CortexPageStore } from './page_store';

export const createCortexStore = ({
  esClient,
  logger,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
}): CortexPageStore => createCortexPageStore({ esClient, logger, spaceId, signal });

export const registerCortexAiIndex = (
  contextEngine: ContextEnginePluginSetup | undefined,
  logger: Logger
): void => {
  if (!contextEngine) {
    logger.debug('contextEngine is not available — Cortex AI index will not be registered');
    return;
  }

  contextEngine.registerAiIndex(CORTEX_AI_INDEX_ID, {
    description: i18n.translate('xpack.nightshiftInvestigations.cortex.aiIndexDescription', {
      defaultMessage:
        'Nightshift Cortex wiki pages — durable, cross-linked knowledge the investigator reads before each run.',
    }),
    dest: { type: 'index', value: CORTEX_AI_INDEX_DEST },
    automations: [],
    sources: [],
    traces: [],
  });
};

export const hydrateCortexWorkspace = async ({
  session,
  esClient,
  spaceId,
  signal,
  logger,
}: {
  session: SandboxSession;
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  logger: Logger;
}): Promise<void> => {
  const store = createCortexStore({ esClient, logger, spaceId, signal });
  await materializeCortex({ session, store, logger });
};

export const runCortexOptimize = async ({
  request,
  agentId,
  userMessage,
  assistantMessage,
  esClient,
  spaceId,
  signal,
  getInference,
  getSearchInferenceEndpoints,
  logger,
}: {
  request: KibanaRequest;
  agentId?: string;
  userMessage: string;
  assistantMessage: string;
  esClient: ElasticsearchClient;
  spaceId: string;
  signal?: AbortSignal;
  getInference: () => InferenceServerStart | undefined;
  getSearchInferenceEndpoints: () => SearchInferenceEndpointsPluginStart | undefined;
  logger: Logger;
}): Promise<void> => {
  // Only the Nightshift investigator writes to Cortex: it is the one agent whose post-execution
  // hook runs this workflow, and other agents' rounds must not edit the wiki. An unidentified
  // caller is refused rather than trusted — the optimize workflow has a manual trigger, so it can
  // be run without an agent id.
  if (agentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID) {
    logger.debug(
      'Cortex optimizer skipped — round was not produced by the Nightshift investigator'
    );
    return;
  }

  const inference = getInference();
  const searchInferenceEndpoints = getSearchInferenceEndpoints();
  if (!inference || !searchInferenceEndpoints) {
    logger.debug('Cortex optimizer skipped — inference or connectors unavailable');
    return;
  }

  const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
    SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID,
    request
  );
  const connectorId = endpoints[0]?.connectorId;
  if (!connectorId) {
    logger.debug('Cortex optimizer skipped — no investigation inference connector');
    return;
  }

  const store = createCortexStore({ esClient, logger, spaceId, signal });
  const inferenceClient = inference.getClient({ request });
  await optimizeCortex({
    store,
    proposeEdits: createLlmProposeCortexEdits({ inferenceClient, connectorId }),
    userMessage,
    assistantMessage,
    logger,
  });
};
