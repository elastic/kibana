/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup } from '../types';

/**
 * Example hook registrations for every agentBuilder lifecycle event.
 * Intended for documentation and local experimentation.
 */
export const registerAgentBuilderHooksExample = (agentBuilder?: AgentBuilderPluginSetup) => {
  if (!agentBuilder) return;

  agentBuilder.hooks.register({
    id: 'example-hooks',
    [HookLifecycle.beforeConversationRound]: {
      mode: HookExecutionMode.blocking,
      handler: (context) => {
        console.log('beforeConversationRound', context.agentId);
        return {
          nextInput: {
            ...context.nextInput,
            message: context.nextInput.message
              ? `${context.nextInput.message} (hooked beforeConversationRound)`
              : undefined,
          },
        };
      },
    },
    [HookLifecycle.afterConversationRound]: {
      mode: HookExecutionMode.blocking,
      handler: (context) => {
        console.log('afterConversationRound', context.agentId);
        return {
          round: {
            ...context.round,
            response: {
              ...context.round.response,
              message: `${context.round.response.message} (hooked afterConversationRound)`,
            },
          },
        };
      },
    },
    [HookLifecycle.beforeToolCall]: {
      mode: HookExecutionMode.blocking,
      handler: (context) => {
        console.log('beforeToolCall', context.agentId, JSON.stringify(context, null, 2));
        return {
          toolParams: {
            ...context.toolParams,
            _hooked_before_tool_call: true,
          },
        };
      },
    },
    [HookLifecycle.afterToolCall]: {
      mode: HookExecutionMode.blocking,
      handler: (context) => {
        console.log('afterToolCall', context.agentId, JSON.stringify(context, null, 2));
        return {
          toolReturn: {
            ...context.toolReturn,
            results: [
              ...(context.toolReturn.results ?? []),
              {
                tool_result_id: 'hook-example',
                type: ToolResultType.other,
                data: { _hooked_after_tool_call: true },
              },
            ],
          },
        };
      },
    },
  });
};
