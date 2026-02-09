/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { ToastsStart } from '@kbn/core-notifications-browser';

export interface BrowserToolCall {
  tool_id: string;
  call_id: string;
  params: unknown;
  timestamp: number;
}

export class BrowserToolExecutor {
  private toasts?: ToastsStart;

  constructor(toasts?: ToastsStart) {
    this.toasts = toasts;
  }

  /**
   * Execute browser tool calls, tracking which have already been executed
   * to prevent re-execution on history load
   */
  async executeToolCalls(
    calls: BrowserToolCall[],
    tools: Map<string, BrowserApiToolDefinition<any>>
  ): Promise<void> {
    for (const call of calls) {
      const tool = tools.get(call.tool_id);
      if (!tool) {
        continue;
      }

      try {
        const validatedParams = tool.schema.parse(call.params);
        await tool.handler(validatedParams);

        if (this.toasts) {
          this.toasts.addSuccess({
            title: `Executed: ${tool.description}`,
            toastLifeTimeMs: 3000,
          });
        }
      } catch (error) {
        if (this.toasts) {
          this.toasts.addDanger({
            title: `Failed to execute: ${tool.description}`,
            text: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }
}
