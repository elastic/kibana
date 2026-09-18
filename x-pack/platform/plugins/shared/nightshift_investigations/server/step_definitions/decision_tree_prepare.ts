/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { Logger } from '@kbn/core/server';
import { NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID } from '../agents/deductive_investigation';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { prepareReinforcementTurn } from '../decision_trees/register_decision_trees';

const MAX_INPUT_CHARS = 100_000;
const MAX_TOOL_CALLS = 2_000;

const toolCallSchema = z
  .object({
    tool_id: z.string().max(512).optional(),
    tool_call_id: z.string().max(512).optional(),
    params: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const toolCallsSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  return value;
}, z.array(toolCallSchema).max(MAX_TOOL_CALLS).optional());

export const decisionTreePrepareStepDefinition = ({
  getTelemetryConnectorId,
  logger,
}: {
  getTelemetryConnectorId: () => string | undefined;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'nightshift.decisionTreePrepare',
    label: 'Prepare Decision Tree Reinforcement Turn',
    category: StepCategory.Ai,
    description:
      'Builds the reinforcement agent message for a completed investigation round: the transcript, ' +
      'the decision trees available to edit, the learnings already on file, and the turn script.',
    inputSchema: z.object({
      prompt: z.string().max(MAX_INPUT_CHARS).describe('The user message that started the round.'),
      response: z
        .string()
        .max(MAX_INPUT_CHARS)
        .describe("The investigator's final response for the round."),
      agent_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Agent id that produced the round. Rounds from other agents are skipped.'),
      tool_calls: toolCallsSchema.describe(
        'Investigator tool calls from this round. Used to see which decision-tree files were read.'
      ),
    }),
    outputSchema: z.object({
      message: z.string().describe('Message to hand the reinforcement agent.'),
      tree_count: z.number().describe('Number of decision trees the agent may edit.'),
      skipped: z.boolean().describe('True when this round is not eligible for reinforcement.'),
    }),
    handler: async (context) => {
      const { prompt, response, agent_id: agentId, tool_calls: toolCalls } = context.input;

      // Only the deductive investigator's rounds feed the decision trees: this workflow is its
      // post-execution hook, and another agent's round must not rewrite the trees.
      if (agentId && agentId !== NIGHTSHIFT_DEDUCTIVE_INVESTIGATION_AGENT_ID) {
        return { output: { message: '', tree_count: 0, skipped: true } };
      }

      const telemetryConnectorId = getTelemetryConnectorId();
      const { spaceId } = context.contextManager.getContext().workflow;
      const { message, treeCount } = await prepareReinforcementTurn({
        prompt,
        response,
        connectorNames: telemetryConnectorId ? [telemetryConnectorId] : [],
        esClient: context.contextManager.getScopedEsClient(),
        logger,
        spaceId,
        toolCalls: (toolCalls ?? []) as InvestigationToolCall[],
      });

      return { output: { message, tree_count: treeCount, skipped: false } };
    },
  });
