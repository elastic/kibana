/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_GENERATE_ESQL_SKILL = defineSkillType({
  id: 'platform.generate_esql',
  name: 'generate_esql',
  basePath: 'skills/platform',
  description: 'Generate ES|QL queries from natural language descriptions',
  content: `# ES|QL Query Generation

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks for ANY of these:
- Generate/create/write an ES|QL query
- Convert natural language to ES|QL
- Build an ES|QL query for searching/filtering/aggregating data
- Create a query to count, find, show, or analyze data using ES|QL
- Any request mentioning "ES|QL" and wanting a query generated

**ALWAYS call the tool - do NOT write ES|QL queries from memory.**

## RESPONSE FORMAT (MANDATORY)

Your response MUST contain:
1. The generated ES|QL query from the tool result
2. A brief explanation of what the query does

### When query generation succeeds:
Show the ES|QL query in a code block, then briefly explain what it does:

\`\`\`esql
FROM logs-*
| WHERE log.level == "error"
| STATS count = COUNT(*) BY host.name
| SORT count DESC
| LIMIT 10
\`\`\`

This query counts error logs per host and shows the top 10.

### When clarification is needed:
If the request is vague (e.g., "Generate an ES|QL query" with no details):
- Ask what data they want to query (index pattern)
- Ask what they want to find, count, or analyze
- Ask about any filters or time ranges needed

### When the query cannot be generated:
State clearly what information is missing or why the query couldn't be generated.

## FORBIDDEN RESPONSES
- Do NOT write ES|QL queries without calling the tool
- Do NOT explain ES|QL syntax in general terms without generating a specific query
- Do NOT suggest alternative query languages unless explicitly asked
- Do NOT apologize or add disclaimers about query accuracy

## Tool Parameters
- \`query\`: Natural language description of what the query should do (REQUIRED)
- \`index\`: Target index pattern, e.g., "logs-*", "metrics-*" (optional - tool will auto-detect if not provided)
- \`context\`: Additional context about schema, fields, or requirements (optional)

## Examples

**User**: "Generate an ES|QL query to count all documents in logs-*"
**Action**: Call generate_esql with query="count all documents in logs-*", index="logs-*"

**User**: "Create a query to find error logs from the last 24 hours"
**Action**: Call generate_esql with query="find error logs from the last 24 hours"

**User**: "Generate an ES|QL query"
**Action**: Ask for clarification: "What data do you want to query? Please provide:
1. The index pattern (e.g., logs-*, metrics-*)
2. What you want to find, count, or analyze
3. Any filters or time constraints"
`,
  getAllowedTools: () => ['platform.core.generate_esql'],
});
