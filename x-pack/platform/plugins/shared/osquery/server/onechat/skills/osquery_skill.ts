/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { tool } from '@langchain/core/tools';
import type { Skill } from '@kbn/agent-builder-common/skills';
import type { GetOsqueryAppContextFn } from './utils';
import { getLiveQuerySkill } from './live_query_skill';
import { getPacksSkill } from './packs_skill';
import { getSavedQueriesSkill } from './saved_queries_skill';
import { getStatusSkill } from './status_skill';

const OSQUERY_SKILL: Omit<Skill, 'tools'> = {
    namespace: 'osquery.entrypoint',
    name: 'Osquery (Entrypoint)',
    description: 'Single entrypoint for Osquery: status, schema, packs, saved queries, live queries, and results',
    content: `# Osquery

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this osquery tool when the user mentions ANY of these:
- "osquery" in any context (status, tables, installed, configured, etc.)
- Asking if osquery is installed, configured, or available
- Questions about osquery tables, columns, or schema
- Questions about osquery packs or saved queries
- Any query, live query, or results from osquery

**CRITICAL: If the question contains the word "osquery", you MUST call this tool.**
**NEVER answer an osquery question without calling the tool first.**
**Even for "Is osquery installed?", you MUST call get_status first.**

## RESPONSE FORMAT (MANDATORY)

Your response MUST contain ONLY:
1. Direct data from the tool results
2. No explanations or background information
3. No suggestions or setup instructions

**EXAMPLE - Correct response for status:**
"Osquery is installed. Package policies: 3."

**EXAMPLE - Incorrect response (DO NOT DO THIS):**
"Osquery is a tool that allows you to query your endpoints. Based on the check, it appears to be installed..."

## Operations Guide

### Check Status: \`get_status\`
\`\`\`
osquery({ operation: "get_status" })
\`\`\`
**Response format:** Report ONLY status from tool results. Example:
- "Osquery is installed on X agents."
- "Osquery integration is not configured."
Do NOT explain what osquery is or how to configure it.

### Get Agents: \`get_agents\` (REQUIRED before running queries)
\`\`\`
osquery({ operation: "get_agents", params: { hostname: "server-name" } })  // Search by hostname
osquery({ operation: "get_agents" })  // List all agents
\`\`\`
**CRITICAL:** Use this to get agent IDs before running queries. run_live_query requires agent IDs (UUIDs), NOT hostnames.
Returns: id (agent ID), hostname, status (online/offline), platform

### Browse Schema: \`get_schema\`
\`\`\`
osquery({ operation: "get_schema" })  // List all tables
osquery({ operation: "get_schema", params: { table: "processes" } })  // Get specific table
\`\`\`
**Response format:** List ONLY table names or column names from tool results.
Do NOT explain what tables or columns mean.
Do NOT describe what kind of data the columns contain.
Just list the names and types, nothing more.

### List Saved Queries: \`list_saved_queries\`
\`\`\`
osquery({ operation: "list_saved_queries" })
\`\`\`
**Response format:**
- If queries exist: "Found X saved queries:" then list names and IDs
- If no queries: "No saved queries found."
Do NOT suggest creating queries.

### List Packs: \`list_packs\`
\`\`\`
osquery({ operation: "list_packs" })
\`\`\`
**Response format:**
- If packs exist: "Found X packs:" then list names and IDs
- If no packs: "No packs found."
Do NOT suggest creating packs.

### Run Live Query: \`run_live_query\` (requires confirmation)
\`\`\`
osquery({ operation: "run_live_query", params: { query: "SELECT ...", agent_ids: ["<agent_id>"], confirm: true } })
\`\`\`
**IMPORTANT:** 
- Use agent IDs from \`get_agents\`, NOT hostnames!
- Returns: \`action_id\` (parent), \`queries\` array (with per-query action_ids), \`agents\`
- **Use \`queries[].action_id\` for get_live_query_results, NOT the parent \`action_id\`**

### Fetch Results: \`get_live_query_results\`
\`\`\`
osquery({ operation: "get_live_query_results", params: { actionId: "<queries[0].action_id>", agentCount: <agent_count> } })
\`\`\`
**CRITICAL:** 
- Use \`queries[].action_id\` from run_live_query response, NOT the parent action_id!
- **Always pass \`agentCount\` from the run_live_query response for proper completion detection!**
- Always call this after run_live_query to get actual data.

## Live Query Workflow (for investigations)

1. **MANDATORY - Get agent ID first:** \`get_agents\` with hostname to find the agent ID
2. **Check schema:** \`get_schema\` with table name
3. **Run query:** \`run_live_query\` with agent_ids (NOT hostnames!) and confirm: true
   - Response includes \`queries[].action_id\` - use this for fetching results!
4. **MANDATORY - Fetch results:** \`get_live_query_results\` with \`queries[].action_id\` (NOT parent action_id)
5. **Analyze results:** Report findings from actual data

## CRITICAL: Agent ID vs Hostname

**WRONG - Using hostname:**
\`\`\`
osquery({ operation: "run_live_query", params: { agent_ids: ["my-server-hostname"], ... } })  // WRONG!
\`\`\`

**CORRECT - Full workflow with proper action_id handling:**
\`\`\`
// Step 1: Get agent ID
osquery({ operation: "get_agents", params: { hostname: "my-server-hostname" } })
// Returns: { agents: [{ id: "abc-123-def-456", hostname: "my-server-hostname", status: "online" }] }

// Step 2: Run the query
osquery({ operation: "run_live_query", params: { agent_ids: ["abc-123-def-456"], query: "SELECT * FROM processes LIMIT 5", confirm: true } })
// Returns: { action_id: "parent-id", agent_count: 1, queries: [{ action_id: "query-action-id-123", agent_count: 1, ... }], agents: [...] }

// Step 3: Fetch results using queries[].action_id AND agentCount (NOT the parent action_id!)
osquery({ operation: "get_live_query_results", params: { actionId: "query-action-id-123", agentCount: 1 } })
\`\`\`

## FORBIDDEN RESPONSES (will cause evaluation failure)
- "Osquery is a tool that allows you to..."
- "To configure osquery, you need to..."
- "Let me know if you need help with..."
- "The processes table contains information about..."
- "This column is used for..."
- Any explanation or description not directly from tool results
- Any setup instructions or suggestions
- Background information about osquery or tables
- Definitions or explanations of what columns mean

## Read-Only Limitations
This tool cannot create, modify, or delete packs, saved queries, or configurations.
For modifications, direct users to Kibana UI: Stack Management > Osquery.`,
};

/**
 * Collects all tools from individual osquery skills for delegation.
 * @internal
 */
const getDelegatedTools = (getOsqueryContext: GetOsqueryAppContextFn) => {
    return [
        ...getStatusSkill(getOsqueryContext).tools,
        ...getLiveQuerySkill(getOsqueryContext).tools, // Includes get_agents, get_schema, run_live_query, get_live_query_results, get_action_results
        ...getPacksSkill(getOsqueryContext).tools,
        ...getSavedQueriesSkill(getOsqueryContext).tools,
    ];
};

/**
 * Creates the unified Osquery skill that serves as a single entrypoint for all osquery operations.
 *
 * This skill consolidates all osquery functionality into one tool with operation-based routing,
 * following the OneChat guideline of "one tool per skill" for better LLM tool selection.
 *
 * @param getOsqueryContext - Factory function that returns the OsqueryAppContext at runtime.
 *                            This allows lazy initialization and proper dependency injection.
 * @returns A Skill object containing the unified osquery tool with all operations.
 *
 * @example
 * ```typescript
 * const osquerySkill = getOsquerySkill(() => osqueryAppContext);
 *
 * // The skill exposes a single 'osquery' tool that routes via 'operation':
 * // - operation: "get_status" - Check osquery installation status
 * // - operation: "get_schema" - Browse osquery table schemas
 * // - operation: "list_packs" / "get_pack" - Manage packs
 * // - operation: "list_saved_queries" / "get_saved_query" - Manage saved queries
 * // - operation: "run_live_query" - Execute live queries (requires confirm: true)
 * // - operation: "get_live_query_results" / "get_action_results" - Fetch results
 * ```
 *
 * @remarks
 * The `run_live_query` operation requires explicit confirmation (`confirm: true`) as it
 * is a potentially disruptive operation that executes queries on agents.
 *
 * @see {@link getLiveQuerySkill} for standalone live query, results, and schema functionality
 * @see {@link getPacksSkill} for standalone packs functionality
 * @see {@link getSavedQueriesSkill} for standalone saved queries functionality
 * @see {@link getStatusSkill} for standalone status functionality
 */
export const getOsquerySkill = (getOsqueryContext: GetOsqueryAppContextFn): Skill => {
    const delegatedTools = getDelegatedTools(getOsqueryContext);

    const OSQUERY_TOOL = tool(
        async (input: unknown, config) => {
            const asAny = input as any;
            const { operation, params, ...rest } = asAny ?? {};
            const toolParams = ((params ?? rest) ?? {}) as Record<string, unknown>;

            const operationToToolName: Record<string, string> = {
                get_status: 'get_status',
                get_agents: 'get_agents',
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
                        operation: z.literal('get_agents'),
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
