/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { z } from '@kbn/zod';

/**
 * Schema for the platform.search tool.
 * Exported for use by proxy tools that route to this skill.
 *
 * The tool uses a discriminated union on `operation`:
 * - `operation: 'search'` - Routes to platform.core.search for natural language / KQL queries
 * - `operation: 'execute_esql'` - Routes to platform.core.execute_esql for ES|QL queries
 *
 * Parameters can be passed either as:
 * - `{ operation, params: { ... } }` (preferred)
 * - `{ operation, ...flattenedParams }` (flattened compat)
 */
export const platformSearchSchema = z.discriminatedUnion('operation', [
  z
    .object({
      operation: z.literal('search').describe('Run a Kibana-mediated read-only search.'),
      params: z
        .object({
          query: z.string().describe('A natural language query expressing the search request'),
          index: z
            .string()
            .optional()
            .describe(
              '(optional) Index to search against (e.g., "logs-*", "packetbeat-*"). If not provided, will automatically select the best index based on the query.'
            ),
          fields: z
            .array(z.string())
            .optional()
            .describe('(optional) Preferred output fields to keep in the result'),
        })
        .passthrough()
        .optional()
        .describe('Parameters for the search operation'),
    })
    .passthrough(),
  z
    .object({
      operation: z
        .literal('execute_esql')
        .describe('Run a Kibana-mediated ES|QL query (read-only).'),
      params: z
        .object({
          query: z.string().describe('The ES|QL query to execute'),
        })
        .passthrough()
        .optional()
        .describe('Parameters for the ES|QL operation'),
    })
    .passthrough(),
]);

export const PLATFORM_SEARCH_SKILL = defineSkillType({
  id: 'platform.search',
  name: 'search',
  basePath: 'skills/platform',
  description: 'Search and query data via Kibana (read-only)',
  content: `# Platform Search

## What this skill does
Searches data in Kibana using ES|QL/KQL/filters (read-only).

## When to use
- Searching logs, metrics, or other indexed data
- Finding specific events or documents
- Running ES|QL queries for aggregations and analysis

## Tools and operations
- Use \`platform.search\` (single tool for this skill):
  - \`operation: "search"\` - for natural language search queries
  - \`operation: "execute_esql"\` - for explicit ES|QL queries

## Response format (CRITICAL - FOLLOW EXACTLY)
Your response MUST be brief and data-focused:

**If results found:**
"Found [N] [items]. [Brief summary if aggregation]

[Table or list of data with relevant fields only]"

**If no results or empty data:**
"No [items] found matching the criteria."

**If search/query failed or index doesn't exist:**
"No [items] found - the index may not contain matching data."

**If user asks about missing data or how to add data:**
Briefly explain that data ingestion options include:
- Setting up Elastic Agent or Beats for log/metric collection
- Using the Elasticsearch Bulk API for direct indexing
- Creating a data integration from the Integrations page

**NEVER include in your response:**
- Explanations of how you searched
- Descriptions of the query or methodology  
- The ES|QL or query syntax you used
- Error stack traces or technical details
- Suggestions for follow-up queries (unless specifically asked)
- Disclaimers about the data
- Explanations of field meanings
- Apologies or "I'm sorry" phrases

## Examples

Query: "Search for error logs in the last 24 hours from logs-*"
Response: "Found 3 error logs in the last 24 hours:

| @timestamp | log.level | message |
|------------|-----------|---------|
| 2024-01-15T10:23:45Z | error | Connection timeout |
| 2024-01-15T10:22:30Z | error | Database failed |
| 2024-01-15T09:15:00Z | error | Auth rejected |"

Query: "Use ES|QL to count events by log level"
Response: "Event counts by log level:

| log.level | count |
|-----------|-------|
| info | 1523 |
| warn | 89 |
| error | 12 |"

Query: "Find critical alerts from the last 15 minutes"
Response: "No critical alerts found in the last 15 minutes."

Query: "I don't see any logs, how can I add data?"
Response: "You can ingest data using:
- **Elastic Agent/Beats**: Deploy agents to collect logs/metrics automatically
- **Bulk API**: Index data directly via POST /_bulk
- **Integrations**: Add a data integration from Fleet > Integrations"
`,
  getAllowedTools: () => ['platform.core.search', 'platform.core.execute_esql'],
});
