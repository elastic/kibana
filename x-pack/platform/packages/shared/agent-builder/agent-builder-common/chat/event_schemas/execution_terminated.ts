/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { AgentPromptType } from '../../agents/prompts';
import { conversationRoundStepSchema } from './conversation_round_step';

// RoundState (AgentNodeState currently has only one member: ExecuteToolNodeState)
const roundStateSchema = z.object({
  version: z.number(),
  agent: z.object({
    current_cycle: z.number(),
    error_count: z.number(),
    nodes: z.array(
      z.object({
        step: z.literal('execute_tool'),
        tool_call_id: z.string(),
        tool_id: z.string(),
        tool_params: z.record(z.string(), z.unknown()),
        tool_state: z.unknown(),
      })
    ),
  }),
});

// RuntimeAgentConfigurationOverrides (Pick of AgentConfiguration)
const runtimeAgentConfigurationOverridesSchema = z.object({
  instructions: z.string().optional(),
  tools: z.array(z.object({ tool_ids: z.array(z.string()) })).optional(), // ToolSelection[]
  skill_ids: z.array(z.string()).optional(),
  enable_elastic_capabilities: z.boolean().optional(),
});

// PromptRequest — discriminated union on AgentPromptType
const promptRequestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(AgentPromptType.confirmation),
    id: z.string(),
    title: z.string().optional(),
    message: z.string().optional(),
    confirm_text: z.string().optional(),
    cancel_text: z.string().optional(),
    color: z.enum(['primary', 'warning', 'danger']).optional(), // ConfirmPromptColor
  }),
  z.object({
    type: z.literal(AgentPromptType.authorization),
    id: z.string(),
    connector_id: z.string(),
    connector_name: z.string(),
    connector_type: z.string(),
    auth_method: z.enum(['oauth_authorization_code', 'ears']), // AuthorizationMethod
  }),
  z.object({
    type: z.literal(AgentPromptType.ask_user_question),
    id: z.string(),
    questions: z.array(
      z.object({
        question: z.string(),
        options: z.array(z.object({ label: z.string(), description: z.string().optional() })),
        multi_select: z.boolean(),
      })
    ),
  }),
]);

export const executionTerminatedEventDataSchema = z.object({
  time_to_first_token: z.number(),
  time_to_last_token: z.number(),
  model_usage: z.object({
    connector_id: z.string(),
    llm_calls: z.number(),
    input_tokens: z.number(),
    output_tokens: z.number(),
    cached_input_tokens: z.number().optional(),
    model: z.string().optional(),
  }),
  trace_id: z.union([z.string(), z.array(z.string())]).optional(),
  steps: z.array(conversationRoundStepSchema).optional(),
  state: roundStateSchema.optional(),
  configuration_overrides: runtimeAgentConfigurationOverridesSchema.optional(),
  outcome: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('responded'),
      response: z.object({
        message: z.string(),
        structured_output: z.custom<object>((v) => typeof v === 'object' && v !== null).optional(),
      }),
    }),
    z.object({
      type: z.literal('prompt_requested'),
      prompts: z.array(promptRequestSchema),
    }),
  ]),
});
