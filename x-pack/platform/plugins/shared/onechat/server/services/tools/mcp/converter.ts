/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, type ZodObject } from '@kbn/zod';
import type { OpenAPIV3 } from 'openapi-types';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { InternalToolDefinition } from '../tool_provider';
import type { MCPToolWithMetadata } from './types';

/**
 * Convert an MCP JSON Schema to a Zod schema.
 *
 * Handles common JSON Schema types used in MCP tools:
 * - string, number, boolean, integer
 * - object (with properties)
 * - array
 * - enum
 * - optional fields
 *
 * @param schema The OpenAPI JSON Schema object
 * @param required Array of required property names
 * @returns Zod schema
 */
export function convertJsonSchemaToZod(
  schema: OpenAPIV3.NonArraySchemaObject,
  required: string[] = []
): z.ZodTypeAny {
  // Handle object type
  if (schema.type === 'object' || schema.properties) {
    const shape: Record<string, z.ZodTypeAny> = {};
    const props = schema.properties || {};
    const requiredFields = schema.required || required;

    for (const [key, propSchema] of Object.entries(props)) {
      if (typeof propSchema === 'boolean') {
        // Boolean schema (true = any, false = never)
        shape[key] = propSchema ? z.any() : z.never();
      } else {
        const isRequired = requiredFields.includes(key);
        let fieldSchema = convertJsonSchemaToZod(propSchema as OpenAPIV3.NonArraySchemaObject, []);

        // Add description if present
        if (propSchema.description) {
          fieldSchema = fieldSchema.describe(propSchema.description);
        }

        // Make optional if not required
        if (!isRequired) {
          fieldSchema = fieldSchema.optional();
        }

        shape[key] = fieldSchema;
      }
    }

    return z.object(shape);
  }

  // Handle array type
  if (schema.type === 'array') {
    if (schema.items && typeof schema.items !== 'boolean') {
      const itemSchema = convertJsonSchemaToZod(schema.items as OpenAPIV3.NonArraySchemaObject, []);
      return z.array(itemSchema);
    }
    return z.array(z.any());
  }

  // Handle enum
  if (schema.enum && schema.enum.length > 0) {
    const [first, ...rest] = schema.enum as [string, ...string[]];
    return z.enum([first, ...rest]);
  }

  // Handle primitive types
  switch (schema.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'integer':
      return z.number().int();
    case 'boolean':
      return z.boolean();
    case 'null':
      return z.null();
    default:
      // Fallback to any for unknown types
      return z.any();
  }
}

/**
 * Convert an MCP tool to OneChat InternalToolDefinition format.
 *
 * Transforms:
 * - Tool ID → mcp.{connectorId}.{toolName}
 * - JSON Schema → Zod schema
 * - Adds provider metadata
 * - Creates execution handler
 *
 * @param mcpTool The MCP tool from connector
 * @param connectorId The connector ID
 * @param connectorName The connector name
 * @param actionsClient Actions client for execution
 * @returns OneChat internal tool definition
 */
export function convertMcpToolToOnechatTool(
  mcpTool: MCPToolWithMetadata,
  connectorId: string,
  actionsClient: any // ActionsClient - avoiding circular dependency
): InternalToolDefinition {
  const { name, description, inputSchema, provider } = mcpTool;

  return {
    id: provider.id, // Already has mcp.{connectorId}.{toolName} format from metadata
    type: ToolType.builtin, // MCP tools are treated as code-based (readonly)
    description: description || `Tool: ${name}`,
    tags: ['mcp', `connector:${connectorId}`],
    configuration: {
      connectorId,
      toolName: name,
    },

    // Schema conversion
    getSchema: async () => {
      try {
        return convertJsonSchemaToZod(inputSchema, inputSchema.required || []) as ZodObject<any>;
      } catch (error) {
        // Fallback to empty object schema if conversion fails
        return z.object({});
      }
    },

    // Execution handler
    getHandler: async () => {
      return async (params: unknown, context: any) => {
        try {
          // Execute via Actions plugin
          const result = await actionsClient.execute({
            actionId: connectorId,
            params: {
              subAction: 'callTool',
              subActionParams: {
                name,
                arguments: params,
              },
            },
          });

          if (result.status === 'error') {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  error: {
                    message: result.message || 'Tool execution failed',
                    details: result.serviceMessage,
                  },
                },
              ],
            };
          }

          // Transform MCP response to OneChat format
          const mcpResponse = result.data as { content: Array<{ type: 'text'; text: string }> };
          const textContent = mcpResponse.content
            .filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n');

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  content: textContent,
                  raw: mcpResponse,
                  provider,
                },
              },
            ],
          };
        } catch (error) {
          context.logger.error(`MCP tool execution failed: ${error.message}`);
          return {
            results: [
              {
                type: ToolResultType.error,
                error: {
                  message: error.message || 'Unexpected error during tool execution',
                  stack: error.stack,
                },
              },
            ],
          };
        }
      };
    },

    // Optional: LLM description (use the same description)
    getLlmDescription: async () => description || `Tool: ${name}`,
  };
}
