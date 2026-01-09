/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { ToolHandlerContext } from '@kbn/onechat-server/tools';
import zodToJsonSchema from 'zod-to-json-schema';

/**
 * Skill tools receive OneChat context via LangChain tool config:
 * `config.configurable.onechat`
 */
const getOneChatContext = (config: unknown): Omit<ToolHandlerContext, 'resultStore'> | null => {
    if (!config || typeof config !== 'object') {
        return null;
    }

    const maybeConfig = config as {
        configurable?: { onechat?: Omit<ToolHandlerContext, 'resultStore'> };
    };

    return maybeConfig.configurable?.onechat ?? null;
};

/**
 * Creates a "skill tool" proxy for a OneChat tool.
 *
 * Why: skills are often enabled without all referenced tool ids being attached to the agent.
 * Exposing proxies under `skill.tools` allows execution via `invoke_skill` using the same tool id.
 */
export const createToolProxy = ({
    toolId,
    description,
}: {
    toolId: string;
    description?: string;
}): DynamicStructuredTool => {
    return tool(
        async (params, config) => {
            const onechat = getOneChatContext(config);
            if (!onechat) {
                throw new Error('OneChat context not available');
            }

            const available = await onechat.toolProvider.has({ toolId, request: onechat.request });
            if (!available) {
                return JSON.stringify({
                    error: {
                        message: `Tool "${toolId}" not found. It may be disabled, not registered, or unavailable in this deployment.`,
                    },
                    toolId,
                });
            }

            const result = await onechat.runner
                .runTool({
                    toolId,
                    toolParams: params as Record<string, unknown>,
                })
                .catch(async (e: any) => {
                    // Try to enrich schema-validation errors with the underlying tool schema.
                    // This is especially useful because skill tool schemas are pass-through.
                    try {
                        const underlying = await onechat.toolProvider.get({ toolId, request: onechat.request } as any);
                        const schema = await (underlying as any)?.getSchema?.();
                        const expectedSchemaFull = schema ? zodToJsonSchema(schema, { $refStrategy: 'none' }) : undefined;
                        const operation = (params as any)?.operation;
                        const expectedSchema = (() => {
                            if (!expectedSchemaFull || typeof operation !== 'string') return expectedSchemaFull;
                            const candidates: any[] = expectedSchemaFull?.oneOf ?? expectedSchemaFull?.anyOf ?? [];
                            if (!Array.isArray(candidates) || candidates.length === 0) return expectedSchemaFull;
                            const match = candidates.find((candidate) => {
                                const op = candidate?.properties?.operation;
                                if (!op) return false;
                                if (op.const && op.const === operation) return true;
                                if (Array.isArray(op.enum) && op.enum.includes(operation)) return true;
                                return false;
                            });
                            return match ?? expectedSchemaFull;
                        })();
                        return {
                            error: {
                                message: e?.message ?? String(e),
                                toolId,
                            },
                            ...(typeof operation === 'string' ? { operation } : {}),
                            ...(expectedSchema ? { expected_schema: expectedSchema } : {}),
                            hint: 'Fix the tool call parameters to match expected_schema and retry.',
                        };
                    } catch (_ignored) {
                        throw e;
                    }
                });

            return JSON.stringify(result);
        },
        {
            name: toolId,
            description: description ?? `Proxy to OneChat tool "${toolId}". Parameters must match the underlying tool schema.`,
            // We intentionally allow passthrough parameters so this proxy can match the underlying tool's schema
            // without duplicating it. The tool id + description guides the LLM.
            schema: z.object({}).passthrough(),
        }
    );
};


