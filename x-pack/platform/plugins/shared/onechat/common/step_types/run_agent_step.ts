/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';

/**
 * Step type ID for the onechat run agent step.
 */
export const RunAgentStepTypeId = 'ai.agent';

/**
 * Input schema for the run agent step.
 */
export const InputSchema = z.object({
  /**
   * The ID of the agent to chat with. Defaults to the default Elastic AI agent.
   */
  agent_id: z.string().optional(),
  /**
   * output schema for the run agent step, if provided agent will return structured output
   */
  schema: z.string().optional(),
  /**
   * The user input message to send to the agent.
   */
  message: z.string(),
});

/**
 * Output schema for the run agent step.
 */
export const OutputSchema = z.union([z.string(), z.any()]);

export type RunAgentStepInputSchema = typeof InputSchema;
export type RunAgentStepOutputSchema = typeof OutputSchema;
export type RunAgentStepInput = z.infer<typeof InputSchema>;
export type RunAgentStepOutput = z.infer<typeof OutputSchema>;

/**
 * Common step definition for RunAgent step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const runAgentStepCommonDefinition: CommonStepDefinition<
  RunAgentStepInputSchema,
  RunAgentStepOutputSchema
> = {
  id: RunAgentStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
