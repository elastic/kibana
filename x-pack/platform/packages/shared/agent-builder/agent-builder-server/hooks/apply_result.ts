/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HookLifecycle,
  type BeforeConversationRoundHookContext,
  type AfterConversationRoundHookContext,
  type BeforeToolCallHookContext,
  type AfterToolCallHookContext,
  type HookHandlerResult,
} from './types';

function isResultObject(
  result: void | HookHandlerResult<HookLifecycle>
): result is HookHandlerResult<HookLifecycle> {
  return result != null && typeof result === 'object';
}

/**
 * Apply a beforeConversationRound hook result into context.
 * Only {@link BeforeConversationRoundHookUpdatable.nextInput} is applied.
 */
export function applyBeforeConversationRoundResult(
  context: BeforeConversationRoundHookContext,
  result: void | HookHandlerResult<HookLifecycle.beforeConversationRound>
): BeforeConversationRoundHookContext {
  if (!isResultObject(result) || result.nextInput === undefined) return context;
  return { ...context, nextInput: result.nextInput };
}

/**
 * Apply an afterConversationRound hook result into context.
 * Only {@link AfterConversationRoundHookUpdatable.round} is applied.
 */
export function applyAfterConversationRoundResult(
  context: AfterConversationRoundHookContext,
  result: void | HookHandlerResult<HookLifecycle.afterConversationRound>
): AfterConversationRoundHookContext {
  if (!isResultObject(result) || result.round === undefined) return context;
  return { ...context, round: result.round };
}

/**
 * Apply a beforeToolCall hook result into context.
 * Only {@link BeforeToolCallHookUpdatable.toolParams} is applied.
 */
export function applyBeforeToolCallResult(
  context: BeforeToolCallHookContext,
  result: void | HookHandlerResult<HookLifecycle.beforeToolCall>
): BeforeToolCallHookContext {
  if (!isResultObject(result) || result.toolParams === undefined) return context;
  return { ...context, toolParams: result.toolParams };
}

/**
 * Apply an afterToolCall hook result into context.
 * Only {@link AfterToolCallHookUpdatable.toolReturn} is applied.
 */
export function applyAfterToolCallResult(
  context: AfterToolCallHookContext,
  result: void | HookHandlerResult<HookLifecycle.afterToolCall>
): AfterToolCallHookContext {
  if (!isResultObject(result) || result.toolReturn === undefined) return context;
  return { ...context, toolReturn: result.toolReturn };
}

/**
 * Typed map from lifecycle event to its apply function.
 * Use this to merge a hook's return value into context without a switch.
 */
export const applyHookResultByEvent: {
  [K in HookLifecycle]: (
    context: import('./types').HookContextByEvent[K],
    result: void | HookHandlerResult<K>
  ) => import('./types').HookContextByEvent[K];
} = {
  [HookLifecycle.beforeConversationRound]: applyBeforeConversationRoundResult,
  [HookLifecycle.afterConversationRound]: applyAfterConversationRoundResult,
  [HookLifecycle.beforeToolCall]: applyBeforeToolCallResult,
  [HookLifecycle.afterToolCall]: applyAfterToolCallResult,
};
