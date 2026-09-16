/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ContextEnginePluginSetup } from '@kbn/context-engine-plugin/server';
import {
  DECISION_TREE_AI_INDEX_DEST,
  DECISION_TREE_AI_INDEX_ID,
} from '../../common/decision_trees';
import type { SandboxApiClient } from '../tools/sandbox_bash/grpc_client';
import { createLearningStore } from './learning_store';
import { materializeDecisionTrees } from './materialize';
import { createDecisionTreeStore } from './store';
import { buildReinforcementPrompt } from './turn';

/**
 * Registers the dedicated decision-tree AI index with the Context Engine so it is a managed,
 * discoverable index. The backing Elasticsearch index is auto-created from the `ai-index-idx`
 * template on first write, the same path Cortex uses.
 */
export const registerDecisionTreeAiIndex = (
  contextEngine: ContextEnginePluginSetup | undefined,
  logger: Logger
): void => {
  if (!contextEngine) {
    logger.debug('contextEngine is not available — decision-tree AI index will not be registered');
    return;
  }

  contextEngine.registerAiIndex(DECISION_TREE_AI_INDEX_ID, {
    description: i18n.translate('xpack.nightshiftInvestigations.decisionTrees.aiIndexDescription', {
      defaultMessage:
        'Nightshift decision trees — versioned Mermaid investigation trees and the learnings the reinforcement agent captures for each symptom.',
    }),
    dest: { type: 'index', value: DECISION_TREE_AI_INDEX_DEST },
    automations: [],
    sources: [],
  });
};

/** Writes the stored decision trees into the reinforcement agent's sandbox for this round. */
export const hydrateDecisionTreeWorkspace = async ({
  apiClient,
  conversationId,
  esClient,
  logger,
}: {
  apiClient: SandboxApiClient;
  conversationId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<number> => {
  const store = createDecisionTreeStore({ esClient, logger });
  const trees = await materializeDecisionTrees({ apiClient, conversationId, store, logger });
  return trees.length;
};

/**
 * Builds the reinforcement agent's message for a completed investigation round: the transcript,
 * the trees it may edit, the learnings already on file, and the turn script for this phase.
 */
export const prepareReinforcementTurn = async ({
  prompt,
  response,
  connectorNames,
  esClient,
  logger,
}: {
  prompt: string;
  response: string;
  connectorNames: string[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<{ message: string; treeCount: number }> => {
  const [trees, learnings] = await Promise.all([
    createDecisionTreeStore({ esClient, logger }).list(),
    createLearningStore({ esClient, logger }).list(),
  ]);

  const active = trees.filter((tree) => tree.status !== 'archived');
  return {
    message: buildReinforcementPrompt({
      trees: active,
      learnings,
      connectorNames,
      prompt,
      response,
    }),
    treeCount: active.length,
  };
};
