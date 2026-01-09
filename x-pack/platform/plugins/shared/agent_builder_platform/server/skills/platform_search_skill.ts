/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { ToolHandlerContext } from '@kbn/onechat-server/tools';

const getOneChatContext = (config: unknown): Omit<ToolHandlerContext, 'resultStore'> | null => {
    if (!config || typeof config !== 'object') {
        return null;
    }

    const maybeConfig = config as {
        configurable?: { onechat?: Omit<ToolHandlerContext, 'resultStore'> };
    };

    return maybeConfig.configurable?.onechat ?? null;
};

const PLATFORM_SEARCH_TOOL = tool(
    async (input, config) => {
        const onechat = getOneChatContext(config);
        if (!onechat) {
            throw new Error('OneChat context not available');
        }

        const asAny = input as any;
        const { operation, params, ...rest } = asAny ?? {};

        const toolId = operation === 'search' ? platformCoreTools.search : platformCoreTools.executeEsql;

        const available = await onechat.toolProvider.has({ toolId, request: onechat.request });
        if (!available) {
            return JSON.stringify({
                error: {
                    message: `Tool "${toolId}" not found. It may be disabled, not registered, or unavailable in this deployment.`,
                },
                toolId,
            });
        }

        const result = await onechat.runner.runTool({
            toolId,
            toolParams: ((params ?? rest) ?? {}) as Record<string, unknown>,
        });

        return JSON.stringify(result);
    },
    {
        name: 'platform.search',
        description:
            'Single entrypoint for platform search. Routes to `platform.core.search` (KQL/DSL style) or `platform.core.execute_esql` (ES|QL) based on `operation`.',
        schema: z.discriminatedUnion('operation', [
            // Accept both:
            // - { operation, params: { ... } } (preferred)
            // - { operation, ...params }       (flattened compat)
            z
                .object({
                    operation: z.literal('search').describe('Run a Kibana-mediated read-only search.'),
                    params: z.object({}).passthrough().optional(),
                })
                .passthrough(),
            z
                .object({
                    operation: z.literal('execute_esql').describe('Run a Kibana-mediated ES|QL query (read-only).'),
                    params: z.object({}).passthrough().optional(),
                })
                .passthrough(),
        ]),
    }
);

export const PLATFORM_SEARCH_SKILL: Skill = {
    namespace: 'platform.search',
    name: 'Platform Search',
    description: 'Search and query data via Kibana (read-only)',
    content: `# Platform Search

## What this skill does
Helps you run **read-only** investigations over data in Kibana using safe query primitives (ES|QL/KQL/filters) and summarize results.

## When to use
- You need to answer “what happened?” or “show me examples” using Kibana-visible data.
- You want a quick summary table, top-N, trends, or correlations.

## Inputs to ask the user for
- **Time range** (required)
- **Data source** (index pattern / data view / index prefix)
- **Filter intent** (host/service/user, environment, severity, etc.)
- **Output shape** (table columns, top-N, examples)

## Tools and operations
- Use \`platform.search\` (single tool for this skill):
  - \`operation: "search"\` routes to \`platform.core.search\`
  - \`operation: "execute_esql"\` routes to \`platform.core.execute_esql\`

## Relevant fields (required)
- Always return **only the fields needed** to answer the question.
- For \`operation: "search"\`, pass \`fields\` when you know the desired output columns (e.g. \`["@timestamp","host.name","user.name","message"]\`).
- For \`operation: "execute_esql"\`, include an ES|QL \`KEEP\` clause with the minimal set of columns.

## Safe workflow
1) Ask for time range + data source if missing.\n
2) Start with a narrow query and a small sample.\n
3) Expand only with explicit user intent.\n
4) Summarize results with clear counts and example documents/rows.\n

## Example
- **User**: “Show me failed logins in the last 24h for user alice.”\n
- **Assistant**: Ask for data view/index, run a narrow query, return count + top sources + sample rows.
`,
    tools: [PLATFORM_SEARCH_TOOL],
};


