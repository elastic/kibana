/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { LearningRecord } from '@kbn/nightshift-decision-trees';
import { createDecisionTreeStore } from '../../decision_trees/store';
import { createLearningStore } from '../../decision_trees/learning_store';
import type { SandboxConnectionManager } from '../sandbox_bash/grpc_client';
import {
  RECORD_REMEDIATION_TOOL_ID,
  RECORD_SYSTEM_LEARNING_TOOL_ID,
  RECORD_TOOL_LEARNING_TOOL_ID,
  createRecordRemediationTool,
  createRecordSystemLearningTool,
  createRecordToolLearningTool,
} from './learning_tools';
import {
  DECISION_TREE_SUBMIT_TOOL_ID,
  createSubmitOptimizerResultTool,
} from './submit_optimizer_result_tool';

export {
  DECISION_TREE_SUBMIT_TOOL_ID,
  RECORD_REMEDIATION_TOOL_ID,
  RECORD_SYSTEM_LEARNING_TOOL_ID,
  RECORD_TOOL_LEARNING_TOOL_ID,
};

/** Every tool the reinforcement agent owns, in the order it is expected to reach for them. */
export const DECISION_TREE_TOOL_IDS = [
  RECORD_SYSTEM_LEARNING_TOOL_ID,
  RECORD_TOOL_LEARNING_TOOL_ID,
  RECORD_REMEDIATION_TOOL_ID,
  DECISION_TREE_SUBMIT_TOOL_ID,
] as const;

export const createDecisionTreeTools = ({
  connectionManager,
  connectorNames,
  getSpaceId,
  getUsername,
  logger,
}: {
  connectionManager: SandboxConnectionManager;
  connectorNames: readonly string[];
  getSpaceId: (request: KibanaRequest) => string;
  getUsername?: (request: KibanaRequest) => string | undefined;
  logger: Logger;
}): Array<BuiltinToolDefinition<never>> => {
  const getTreeStore = (esClient: ElasticsearchClient) =>
    createDecisionTreeStore({ esClient, logger });
  const getLearningStore = (esClient: ElasticsearchClient) =>
    createLearningStore({ esClient, logger });

  // Shared between the learning tools (which fill it) and the submit tool (which drains it), so a
  // committed tree version records the learnings the agent captured during the same turn. Keyed by
  // the scoped conversation id so concurrent reinforcement rounds never see each other's learnings.
  const learningBuffer = new Map<string, LearningRecord[]>();
  const onRecord = (conversationId: string, record: LearningRecord) => {
    const existing = learningBuffer.get(conversationId) ?? [];
    existing.push(record);
    learningBuffer.set(conversationId, existing);
  };
  const drainLearnings = (conversationId: string): LearningRecord[] => {
    const buffered = learningBuffer.get(conversationId) ?? [];
    learningBuffer.delete(conversationId);
    return buffered;
  };

  return [
    createRecordSystemLearningTool({ getStore: getLearningStore, logger, getSpaceId, onRecord }),
    createRecordToolLearningTool({
      getStore: getLearningStore,
      logger,
      connectorNames,
      getSpaceId,
      onRecord,
    }),
    createRecordRemediationTool({ getStore: getLearningStore, logger, getSpaceId, onRecord }),
    createSubmitOptimizerResultTool({
      connectionManager,
      getStore: getTreeStore,
      getSpaceId,
      getUsername,
      drainLearnings,
      logger,
    }),
  ] as Array<BuiltinToolDefinition<never>>;
};
