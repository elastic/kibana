/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
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
  logger,
}: {
  connectionManager: SandboxConnectionManager;
  connectorNames: readonly string[];
  getSpaceId: (request: KibanaRequest) => string;
  logger: Logger;
}): Array<BuiltinToolDefinition<never>> => {
  const getTreeStore = (esClient: ElasticsearchClient) =>
    createDecisionTreeStore({ esClient, logger });
  const getLearningStore = (esClient: ElasticsearchClient) =>
    createLearningStore({ esClient, logger });

  return [
    createRecordSystemLearningTool({ getStore: getLearningStore, logger }),
    createRecordToolLearningTool({ getStore: getLearningStore, logger, connectorNames }),
    createRecordRemediationTool({ getStore: getLearningStore, logger }),
    createSubmitOptimizerResultTool({
      connectionManager,
      getStore: getTreeStore,
      getSpaceId,
      logger,
    }),
  ] as Array<BuiltinToolDefinition<never>>;
};
