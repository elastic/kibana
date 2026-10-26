/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ToolCallInvocation,
  internalTools,
  isDynamicToolCall,
  type ToolCallWithResult,
} from '@kbn/agent-builder-common';

/**
 * The inner call carried by an `execute_dynamic_tool` invocation.
 *
 * A dynamic call is stored on its step unwrapped (inner tool id and params, see
 * `ToolCallWithResult.invocation`) and wrapped again whenever it is handed back to the model:
 * rendered into the history or re-run on resume.
 */
export interface DynamicToolCall {
  toolId: string;
  params: Record<string, unknown>;
}

/** The args of an `execute_dynamic_tool` call as the model emits them; both fields are required. */
interface DynamicToolCallArgs {
  tool_id: string;
  params: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDynamicToolCallArgs = (value: unknown): value is DynamicToolCallArgs => {
  if (!isRecord(value)) {
    return false;
  }
  const { tool_id: toolId, params } = value;
  return typeof toolId === 'string' && toolId.length > 0 && isRecord(params);
};

/**
 * The inner call of an `execute_dynamic_tool` invocation, or `undefined` when the args do not
 * have the `{ tool_id, params }` shape the tool's schema requires.
 */
export const unwrapDynamicToolCall = (
  args: Record<string, unknown>
): DynamicToolCall | undefined => {
  if (!isDynamicToolCallArgs(args)) {
    return undefined;
  }
  return { toolId: args.tool_id, params: args.params };
};

/**
 * The step fields an `execute_dynamic_tool` call overrides when stored unwrapped, or `undefined`
 * when the args do not carry an inner call (the step then keeps the outer call as is).
 */
export const dynamicToolCallStepFields = (
  args: Record<string, unknown>
): Pick<ToolCallWithResult, 'tool_id' | 'params' | 'invocation'> | undefined => {
  const call = unwrapDynamicToolCall(args);
  if (!call) {
    return undefined;
  }
  return { tool_id: call.toolId, params: call.params, invocation: ToolCallInvocation.dynamic };
};

/** The `execute_dynamic_tool` args that reach the inner call. */
export const wrapDynamicToolCall = ({
  toolId,
  params,
}: DynamicToolCall): Record<string, unknown> => ({
  tool_id: toolId,
  params,
});

/**
 * The call as the model made it, from a stored step: a dynamic call is wrapped back into
 * `execute_dynamic_tool`, a native call is returned as is. Used wherever a step is handed back
 * to the model (history rendering, resume).
 */
export const toModelToolCall = (
  call: Pick<ToolCallWithResult, 'tool_id' | 'params' | 'invocation'>
): { toolId: string; args: Record<string, unknown> } => {
  if (isDynamicToolCall(call)) {
    return {
      toolId: internalTools.executeDynamicTool,
      args: wrapDynamicToolCall({ toolId: call.tool_id, params: call.params }),
    };
  }
  return { toolId: call.tool_id, args: call.params };
};
