/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

/**
 * Step type ID for the agentBuilder run agent step.
 */
export const RunAgentStepTypeId = 'ai.agent';

/**
 * Input schema for the run agent step.
 */
export const InputSchema = z.object({
  /**
   * output schema for the run agent step, if provided agent will return structured output
   */
  // TODO: replace with proper JsonSchema7 zod schema when https://github.com/elastic/kibana/pull/244223 is merged and released
  schema: z.any().optional().describe('The schema for the output of the agent.'),
  /**
   * The user input message to send to the agent.
   */
  message: z.string().describe('The user input message to send to the agent.'),
  /**
   * Optional existing conversation id to continue a previous conversation.
   */
  conversation_id: z
    .string()
    .optional()
    .describe('Optional existing conversation ID to continue a previous conversation.'),
});

/**
 * Output schema for the run agent step.
 */
export const OutputSchema = z.object({
  message: z
    .string()
    .describe(
      'The text response from the agent. When schema is provided, contains a string version of the structured output'
    ),
  structured_output: z
    .any()
    .optional()
    .describe('The structured output from the agent. Only here when schem was provided'),
  conversation_id: z
    .string()
    .optional()
    .describe(
      'Conversation ID associated with this step execution. Present when create_conversation is enabled or conversation_id is provided.'
    ),
});

/**
 * Config schema for the run agent step.
 */
export const ConfigSchema = z.object({
  /**
   * The ID of the agent to chat with. Defaults to the default Elastic AI agent.
   */
  'agent-id': z
    .string()
    .optional()
    .describe('The ID of the agent to chat with. Defaults to the default Elastic AI agent.'),
  /**
   * The ID of the GenAI connector to use. Defaults to the default GenAI connector.
   */
  'connector-id': z
    .string()
    .optional()
    .describe('The ID of the connector to use. Defaults to the default GenAI connector.'),
  /**
   * When true, create/persist a conversation and associate it with the executing user.
   * If conversation_id is provided, this can auto-create the conversation with that id if it does not exist.
   */
  'create-conversation': z
    .boolean()
    .optional()
    .describe('When true, creates a conversation for the step.'),
});

export type RunAgentStepInputSchema = typeof InputSchema;
export type RunAgentStepOutputSchema = typeof OutputSchema;
export type RunAgentStepConfigSchema = typeof ConfigSchema;

/**
 * Common step definition for RunAgent step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const runAgentStepCommonDefinition: CommonStepDefinition<
  RunAgentStepInputSchema,
  RunAgentStepOutputSchema,
  RunAgentStepConfigSchema
> = {
  id: RunAgentStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
