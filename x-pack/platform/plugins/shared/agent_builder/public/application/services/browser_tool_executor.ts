/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BrowserApiToolDefinition,
  BrowserApiToolHandlerResult,
} from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { ToastsStart } from '@kbn/core-notifications-browser';

export interface BrowserToolCall {
  tool_id: string;
  call_id: string;
  params: unknown;
  timestamp: number;
}

export type BrowserToolExecutionOutcome =
  | { ok: true; result?: BrowserApiToolHandlerResult }
  | { ok: false; error: string };

export class BrowserToolExecutor {
  private toasts?: ToastsStart;

  constructor(toasts?: ToastsStart) {
    this.toasts = toasts;
  }

  /**
   * Execute browser tool calls, tracking which have already been executed
   * to prevent re-execution on history load.
   *
   * One-way tools show success toasts. Two-way tools (`returnsResult`) stay silent
   * on success (only toast on failure) because the agent loop continues automatically.
   */
  async executeToolCalls(
    calls: BrowserToolCall[],
    tools: Map<string, BrowserApiToolDefinition<any>>
  ): Promise<BrowserToolExecutionOutcome[]> {
    const outcomes: BrowserToolExecutionOutcome[] = [];

    for (const call of calls) {
      const tool = tools.get(call.tool_id);
      if (!tool) {
        outcomes.push({ ok: false, error: `Unknown browser tool: ${call.tool_id}` });
        continue;
      }

      try {
        const validatedParams = tool.schema.parse(call.params);
        const handlerReturn = await tool.handler(validatedParams);
        const result =
          handlerReturn && typeof handlerReturn === 'object' && 'results' in handlerReturn
            ? (handlerReturn as BrowserApiToolHandlerResult)
            : undefined;

        if (this.toasts && !tool.returnsResult) {
          this.toasts.addSuccess({
            title: `Executed: ${tool.description}`,
            toastLifeTimeMs: 3000,
          });
        }

        outcomes.push({ ok: true, result });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (this.toasts) {
          this.toasts.addDanger({
            title: `Failed to execute: ${tool.description}`,
            text: message,
          });
        }
        outcomes.push({ ok: false, error: message });
      }
    }

    return outcomes;
  }
}
