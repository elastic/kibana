import type { HookContextByLifecycle } from './types';
import { HookLifecycle, type BeforeAgentHookContext, type BeforeToolCallHookContext, type AfterToolCallHookContext, type HookHandlerResult } from './types';
export declare function applyBeforeAgentResult(context: BeforeAgentHookContext, result: void | HookHandlerResult<HookLifecycle.beforeAgent>): BeforeAgentHookContext;
export declare function applyBeforeToolCallResult(context: BeforeToolCallHookContext, result: void | HookHandlerResult<HookLifecycle.beforeToolCall>): BeforeToolCallHookContext;
export declare function applyAfterToolCallResult(context: AfterToolCallHookContext, result: void | HookHandlerResult<HookLifecycle.afterToolCall>): AfterToolCallHookContext;
/**
 * Map of each hook lifecycle to its corresponding apply-result function.
 */
export type ApplyHookResultByLifecycle = {
    [K in HookLifecycle]: (context: HookContextByLifecycle[K], result: void | HookHandlerResult<K>) => HookContextByLifecycle[K];
};
export declare const applyHookResultByLifecycle: ApplyHookResultByLifecycle;
