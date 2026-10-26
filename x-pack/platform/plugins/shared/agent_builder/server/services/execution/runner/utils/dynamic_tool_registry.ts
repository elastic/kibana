/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutableTool } from '@kbn/agent-builder-server';
import type {
  DynamicToolDefinition,
  ExecutableToolWithOrigin,
} from '@kbn/agent-builder-server/runner/tool_manager';
import { zodToolInputToJsonSchema } from '@kbn/agent-builder-genai-utils/tools/utils/json_schema';

/**
 * Tools the model reaches through the `execute_dynamic_tool` meta-tool rather than through the
 * native tool list. Their definitions live in the transcript as text, so adding or removing one
 * leaves the bound tool list, and with it the prompt cache prefix, untouched.
 *
 * Not to be confused with the `dynamic` option of `ToolManager.addTools`, which binds a tool
 * natively but makes it subject to LRU eviction. That option is retired once every dynamic
 * tool goes through this registry.
 */
export class DynamicToolRegistry {
  private readonly tools = new Map<string, ExecutableToolWithOrigin>();

  /** Registers tools by id; registering an id again replaces the previous entry. */
  public register(tools: ExecutableToolWithOrigin[]): void {
    for (const tool of tools) {
      this.tools.set(tool.id, tool);
    }
  }

  public get(toolId: string): ExecutableToolWithOrigin | undefined {
    return this.tools.get(toolId);
  }

  public has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  public list(): ExecutableToolWithOrigin[] {
    return [...this.tools.values()];
  }

  public ids(): string[] {
    return [...this.tools.keys()];
  }
}

/**
 * Renders the definition the model sees for a dynamic tool: the description it would have as a
 * native tool and its input schema, serialized the same way the inference adapter serializes
 * natively bound tools.
 */
export const renderDynamicToolDefinition = async (
  tool: ExecutableTool
): Promise<DynamicToolDefinition> => {
  const description = tool.getLlmDescription
    ? await tool.getLlmDescription({ description: tool.description, config: tool.configuration })
    : tool.description;
  const schema = await tool.getSchema();
  return {
    tool_id: tool.id,
    description,
    parameters: zodToolInputToJsonSchema(schema),
  };
};
