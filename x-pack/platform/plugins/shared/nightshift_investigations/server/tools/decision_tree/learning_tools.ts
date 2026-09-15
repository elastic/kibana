/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  SYSTEM_LEARNING_CATEGORIES,
  TOOL_LEARNING_CATEGORIES,
} from '@kbn/nightshift-decision-trees';
import type { LearningStore } from '../../decision_trees/learning_store';

export const RECORD_SYSTEM_LEARNING_TOOL_ID = 'nightshift_record_system_learning';
export const RECORD_TOOL_LEARNING_TOOL_ID = 'nightshift_record_tool_learning';
export const RECORD_REMEDIATION_TOOL_ID = 'nightshift_record_remediation';

const MAX_LEARNING_LENGTH = 2048;

/** Learnings earn their slot by being reusable next time, not by being true this time. */
const RETENTION_RULE =
  'Record only what a future investigation could not have worked out for itself and that a human had to correct or redirect you on. Keep it to 1-4 lines of plain language with no raw MEM_* references.';

interface LearningToolDeps {
  getStore: (esClient: ElasticsearchClient) => LearningStore;
  logger: Logger;
}

const systemLearningSchema = z.object({
  category: z
    .enum(SYSTEM_LEARNING_CATEGORIES)
    .describe('Which aspect of the system this learning is about.'),
  content: z
    .string()
    .max(MAX_LEARNING_LENGTH)
    .describe('The learning, in 1-4 lines of plain language.'),
});

const remediationSchema = z.object({
  content: z
    .string()
    .max(MAX_LEARNING_LENGTH)
    .describe('The remediation that resolved the issue, in 1-4 lines of plain language.'),
});

const toolLearningSchema = (connectorNames: readonly string[]) =>
  z.object({
    connector_name:
      connectorNames.length > 0
        ? z
            .enum(connectorNames as [string, ...string[]])
            .describe('The connector this learning is about.')
        : z.string().max(256).describe('The connector this learning is about.'),
    category: z
      .enum(TOOL_LEARNING_CATEGORIES)
      .describe('What kind of tool behaviour this learning captures.'),
    content: z
      .string()
      .max(MAX_LEARNING_LENGTH)
      .describe('The learning, in 1-4 lines of plain language.'),
  });

const recordAndReport = async ({
  store,
  logger,
  input,
}: {
  store: LearningStore;
  logger: Logger;
  input: Parameters<LearningStore['record']>[0];
}) => {
  try {
    const record = await store.record(input);
    return {
      results: [
        {
          type: ToolResultType.other as const,
          data: { text: `Recorded ${record.kind} learning.`, content: record.content },
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.debug(`Rejected ${input.kind} learning: ${message}`);
    return {
      results: [{ type: ToolResultType.error as const, data: { message } }],
    };
  }
};

export const createRecordSystemLearningTool = ({
  getStore,
  logger,
}: LearningToolDeps): BuiltinToolDefinition<typeof systemLearningSchema> => ({
  id: RECORD_SYSTEM_LEARNING_TOOL_ID,
  type: ToolType.builtin,
  description: `Record a durable fact about how this system is built or behaves — an architectural constraint, a dependency, a runtime behaviour, an ownership boundary, or an invariant. Recording a category again replaces the previous entry for it. ${RETENTION_RULE}`,
  tags: ['decision-tree', 'learning'],
  schema: systemLearningSchema,
  annotations: {
    title: 'Record System Learning',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (params, context) =>
    recordAndReport({
      store: getStore(context.esClient.asCurrentUser),
      logger,
      input: { kind: 'system', category: params.category, content: params.content },
    }),
});

export const createRecordToolLearningTool = ({
  getStore,
  logger,
  connectorNames,
}: LearningToolDeps & { connectorNames: readonly string[] }): BuiltinToolDefinition<
  ReturnType<typeof toolLearningSchema>
> => {
  const schema = toolLearningSchema(connectorNames);
  return {
    id: RECORD_TOOL_LEARNING_TOOL_ID,
    type: ToolType.builtin,
    description: `Record a durable fact about using a connector — an error and how to avoid it, a capability or limitation, a query pattern that works, or when to reach for this connector over another. Recording the same connector and category again replaces the previous entry. ${RETENTION_RULE}`,
    tags: ['decision-tree', 'learning'],
    schema,
    annotations: {
      title: 'Record Tool Learning',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: async (params, context) =>
      recordAndReport({
        store: getStore(context.esClient.asCurrentUser),
        logger,
        input: {
          kind: 'tool',
          category: params.category,
          connectorName: params.connector_name,
          content: params.content,
        },
      }),
  };
};

export const createRecordRemediationTool = ({
  getStore,
  logger,
}: LearningToolDeps): BuiltinToolDefinition<typeof remediationSchema> => ({
  id: RECORD_REMEDIATION_TOOL_ID,
  type: ToolType.builtin,
  description: `Record the remediation that actually resolved this issue, so the next investigation of the same symptom can propose it. Recording again replaces the previous remediation. ${RETENTION_RULE}`,
  tags: ['decision-tree', 'learning'],
  schema: remediationSchema,
  annotations: {
    title: 'Record Remediation',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (params, context) =>
    recordAndReport({
      store: getStore(context.esClient.asCurrentUser),
      logger,
      input: { kind: 'remediation', content: params.content },
    }),
});
