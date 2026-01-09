/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { Skill } from '@kbn/onechat-common/skills';
import type { GetOsqueryAppContextFn } from './utils';
import { getLiveQuerySkill } from './live_query_skill';
import { getPacksSkill } from './packs_skill';
import { getSavedQueriesSkill } from './saved_queries_skill';
import { getResultsSkill } from './results_skill';
import { getSchemaSkill } from './schema_skill';
import { getStatusSkill } from './status_skill';

const OSQUERY_SKILL: Omit<Skill, 'tools'> = {
    namespace: 'osquery.entrypoint',
    name: 'Osquery (Entrypoint)',
    description: 'Single entrypoint for Osquery: status, schema, packs, saved queries, live queries, and results',
    content: `# Osquery

## What this skill does
Gives you a **single tool** to work with Osquery:
- Check Osquery integration status
- Browse schema (tables/columns) to author correct SQL
- List/get packs and saved queries
- Run live queries (requires explicit confirmation)
- Fetch live query results and action results

## Tool
Use \`osquery\` with one of the following operations:
- \`operation: "get_status"\`
- \`operation: "get_schema"\`
- \`operation: "list_packs"\` / \`operation: "get_pack"\`
- \`operation: "list_saved_queries"\` / \`operation: "get_saved_query"\`
- \`operation: "run_live_query"\` (**requires \`confirm: true\`**)
- \`operation: "get_live_query_results"\` / \`operation: "get_action_results"\`

## Safety
Running a live query can be disruptive. Always restate:
- which agents will be targeted
- which query will run
- expected impact and timeout
Then require explicit “yes” and pass \`confirm: true\`.`,
};

const getDelegatedTools = (getOsqueryContext: GetOsqueryAppContextFn) => {
    return [
        ...getStatusSkill(getOsqueryContext).tools,
        ...getSchemaSkill(getOsqueryContext).tools,
        ...getPacksSkill(getOsqueryContext).tools,
        ...getSavedQueriesSkill(getOsqueryContext).tools,
        ...getLiveQuerySkill(getOsqueryContext).tools,
        ...getResultsSkill(getOsqueryContext).tools,
    ];
};

export const getOsquerySkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
    const delegatedTools = getDelegatedTools(getOsqueryContext);

    const OSQUERY_TOOL = tool(
        async (input: unknown, config) => {
            const asAny = input as any;
            const { operation, params, ...rest } = asAny ?? {};
            const toolParams = ((params ?? rest) ?? {}) as Record<string, unknown>;

            const operationToToolName: Record<string, string> = {
                get_status: 'get_status',
                get_schema: 'get_schema',
                list_packs: 'list_packs',
                get_pack: 'get_pack',
                list_saved_queries: 'list_saved_queries',
                get_saved_query: 'get_saved_query',
                run_live_query: 'run_live_query',
                get_live_query_results: 'get_live_query_results',
                get_action_results: 'get_action_results',
            };

            const toolName = operationToToolName[String(operation)];
            if (!toolName) {
                throw new Error(`Unsupported osquery operation "${String(operation)}"`);
            }

            if (toolName === 'run_live_query') {
                const confirm = toolParams.confirm;
                if (confirm !== true) {
                    return JSON.stringify({
                        error: {
                            message:
                                'Running a live Osquery query is a potentially disruptive operation. Ask for explicit user confirmation and pass confirm: true.',
                        },
                    });
                }
                // confirm is a router-only safety gate; underlying tool does not accept it.
                delete toolParams.confirm;
                delete toolParams.confirmReason;
            }

            const delegated = delegatedTools.find((t) => t.name === toolName);
            if (!delegated) {
                throw new Error(`Osquery tool "${toolName}" is not available`);
            }

            // Delegate execution while preserving LangChain config (including configurable.onechat)
            const result = await (delegated as any).invoke(toolParams, config);
            return typeof result === 'string' ? result : JSON.stringify(result);
        },
        {
            name: 'osquery',
            description:
                'Single entrypoint for Osquery operations. Use operation to select behavior; pass either {operation, params:{...}} or flattened {operation, ...}.',
            schema: z.discriminatedUnion('operation', [
                z
                    .object({
                        operation: z.literal('get_status'),
                        params: z.object({}).passthrough().optional(),
                    })
                    .passthrough(),
                z
                    .object({
                        operation: z.literal('get_schema'),
                        params: z.object({}).passthrough().optional(),
                    })
                    .passthrough(),
                z
                    .object({
                        operation: z.literal('list_packs'),
                        params: z.object({}).passthrough().optional(),
                    })
                    .passthrough(),
                z
                    .object({
                        operation: z.literal('get_pack'),
                        params: z.object({}).passthrough().optional(),
                    })
                    .passthrough(),
                z
                    .object({
                        operation: z.literal('list_saved_queries'),
                        params: z.object({}).passthrough().optional(),
                    })
                    .passthrough(),
                z
                    .object({
                        operation: z.literal('get_saved_query'),
                        params: z.object({}).passthrough().optional(),
                    })
                    .passthrough(),
                z
                    .object({
                        operation: z.literal('run_live_query'),
                        params: z
                            .object({
                                confirm: z
                                    .boolean()
                                    .describe('REQUIRED. Must be true to run a live query (side-effecting).'),
                                confirmReason: z
                                    .string()
                                    .optional()
                                    .describe('Optional reason why this live query is necessary (for audit/traceability).'),
                            })
                            .passthrough()
                            .optional(),
                    })
                    .passthrough(),
                z
                    .object({
                        operation: z.literal('get_live_query_results'),
                        params: z.object({}).passthrough().optional(),
                    })
                    .passthrough(),
                z
                    .object({
                        operation: z.literal('get_action_results'),
                        params: z.object({}).passthrough().optional(),
                    })
                    .passthrough(),
            ]),
        }
    );

    return {
        ...OSQUERY_SKILL,
        tools: [OSQUERY_TOOL],
    };
};


