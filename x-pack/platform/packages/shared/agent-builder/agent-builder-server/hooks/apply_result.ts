/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HookContextByLifecycle } from './types';
import {
  HookLifecycle,
  type BeforeAgentHookContext,
  type BeforeToolCallHookContext,
  type AfterToolCallHookContext,
  type HookHandlerResult,
} from './types';

function isResultObject(
  result: void | HookHandlerResult<HookLifecycle>
): result is HookHandlerResult<HookLifecycle> {
  return result != null && typeof result === 'object';
}

export function applyBeforeAgentResult(
  context: BeforeAgentHookContext,
  result: void | HookHandlerResult<HookLifecycle.beforeAgent>
): BeforeAgentHookContext {
  if (!isResultObject(result) || result.nextInput === undefined) return context;
  return { ...context, nextInput: result.nextInput };
}

export function applyBeforeToolCallResult(
  context: BeforeToolCallHookContext,
  result: void | HookHandlerResult<HookLifecycle.beforeToolCall>
): BeforeToolCallHookContext {
  if (!isResultObject(result) || result.toolParams === undefined) return context;
  return { ...context, toolParams: result.toolParams };
}

export function applyAfterToolCallResult(
  context: AfterToolCallHookContext,
  result: void | HookHandlerResult<HookLifecycle.afterToolCall>
): AfterToolCallHookContext {
  if (!isResultObject(result) || result.toolReturn === undefined) return context;
  return { ...context, toolReturn: result.toolReturn };
}

/**
 * Map of each hook lifecycle to its corresponding apply-result function.
 */
export type ApplyHookResultByLifecycle = {
  [K in HookLifecycle]: (
    context: HookContextByLifecycle[K],
    result: void | HookHandlerResult<K>
  ) => HookContextByLifecycle[K];
};

export const applyHookResultByLifecycle: ApplyHookResultByLifecycle = {
  [HookLifecycle.beforeAgent]: applyBeforeAgentResult,
  [HookLifecycle.beforeToolCall]: applyBeforeToolCallResult,
  [HookLifecycle.afterToolCall]: applyAfterToolCallResult,
};
