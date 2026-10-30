/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AiIndexOnboardingPromptParams {
  aiIndexId: string;
  aiIndexDest: string;
  kibanaUrl: string;
}

/** Onboarding prompt for coding agents, filled with values for the viewed AI index. */
export const buildAiIndexOnboardingPrompt = ({
  aiIndexId,
  aiIndexDest,
  kibanaUrl,
}: AiIndexOnboardingPromptParams): string => `
# You are connecting this project to the "${aiIndexId}" AI index in Elastic Context Engine

Context Engine turns raw source data and agent memory into Knowledge Indicators (KIs) that agents retrieve to solve problems faster. This AI index stores its Knowledge Indicators in \`${aiIndexDest}\`.

## Kibana API

The Context Engine endpoints below are Kibana APIs. Send them to this Kibana URL: \`${kibanaUrl}\`

Store it as \`KIBANA_URL=${kibanaUrl}\` and prefix every \`/api/...\` path with it.

Send \`elastic-api-version: 2023-10-31\` on every request, plus \`kbn-xsrf: true\` on POST/PUT/DELETE and \`Content-Type: application/json\` on requests with a body.

## Step 1 — Credentials

API key env var: KIBANA_API_KEY (never hardcode it, never print it back)

If that variable is unset, ask the user to create a key from Stack Management → API keys (or \`POST /api/security/api_key\`), export it as KIBANA_API_KEY in their shell, and tell you when it's set. Wait for confirmation. We do not generate or ship a key with this prompt: you must get a real one from the user.

Every HTTP call below authenticates with:

   Authorization: ApiKey $KIBANA_API_KEY

## What you can call

| Operation | Endpoint | Use when |
|---|---|---|
| Describe | GET /api/context_engine/ai_index/${aiIndexId}/_describe | Learn this index's fields, semantic fields, KI types/tags and example ES\\|QL. Always call this before writing a query. |
| Query (retrieve) | POST /api/context_engine/ai_index/_query | Run ES\\|QL, keyword and semantic search fused, over this index's Knowledge Indicators |
| List | GET /api/context_engine/ai_index | See every AI index you can read in this space |
| Add a source | PUT /api/context_engine/ai_index/${aiIndexId} | Point this index at a new ES\\|QL query or connector so Context Engine turns that data into KIs |
| Remember / Forget | MCP tools \`platform.context_engine.remember\` / \`platform.context_engine.forget\` | Save or retract a fact or session memory on this index (only if memory is enabled on it) |

Full plugin reference: \`x-pack/platform/plugins/shared/context_engine/README.md\` in the Kibana repo.

Now work the steps below in order. Do not skip ahead. Stop where a step says to.

## Step 2 — Connect through the Agent Builder MCP server, then brief the user

Prefer this over calling the HTTP routes by hand. It exposes \`list_ai_indices\`, \`describe_ai_index\` and \`query_ai_indices\` (plus \`remember\`/\`forget\` when memory is on) as callable tools at \`${kibanaUrl}/api/agent_builder/mcp\`.

The \`env\` block in an MCP server config is passed literally to that server's subprocess; it is not shell-expanded. So read KIBANA_API_KEY from your own environment right now and write its real value into \`AUTH_HEADER\` below, once, in this local config file only:

   {
     "mcpServers": {
       "elastic": {
         "command": "npx",
         "args": ["mcp-remote", "${kibanaUrl}/api/agent_builder/mcp", "--header", "Authorization:\${AUTH_HEADER}"],
         "env": { "AUTH_HEADER": "ApiKey <value of $KIBANA_API_KEY, resolved now>" }
       }
     }
   }

This file now holds a live credential: keep it local and out of version control (add it to \`.gitignore\` if it lives inside this repo).

Verify it works: call \`list_ai_indices\`, confirm "${aiIndexId}" is in the result, then call \`describe_ai_index\` on it and confirm a real field list comes back. If the MCP server isn't reachable, fall back to the HTTP routes above, authenticating each call with \`Authorization: ApiKey $KIBANA_API_KEY\` read from the environment at call time, never pasted as a literal.

Then give the user a short rundown of what this AI index can do for THIS project, using the table above.

## Step 3 — Scan this repo for integration points

If this directory has application source, read enough to understand it, then map findings against this table. Cite exact files and lines. If the repo is empty or docs-only, say so and skip to Step 5.

| Code pattern | Replace / augment with |
|---|---|
| Chat or support loop that re-reads raw files, tickets, or logs on every question | \`describe_ai_index\` once, then \`query_ai_indices\` before answering |
| Hardcoded FAQ/runbook text duplicated across the codebase | A \`connector\` or \`esql\` source on this AI index, so Context Engine turns the underlying data into KIs instead |
| Grep or regex search over docs/logs for "how do I..." questions | ES\\|QL hybrid search via \`query_ai_indices\` (keyword + \`.semantic\` fields, fused) |
| Per-session state thrown away between runs | \`remember\` for durable facts, \`forget\` to retract them, only if memory is enabled on this index |
| A pipeline already reading some Elasticsearch indices another way | An \`esql\` source pointing at those same indices, so they also feed this AI index's KIs |

## Step 4 — Propose, then get approval before touching code

Present findings as a numbered list: file + line range, the operation(s) involved, one line on why it's an improvement. Ask which to implement. Do not modify files until the user approves specific items.

Non-negotiable when implementing:
- Always call \`_describe\` (or the \`describe_ai_index\` tool) before writing an ES|QL query against this index. It gives the real field names and working example queries, not assumed ones.
- \`PUT /api/context_engine/ai_index/${aiIndexId}\` replaces the whole record. GET the current record first, merge your change into its \`sources\` (or \`automations\`, \`description\`), and send the full object back, or you will wipe out everything you left out.
- Don't fight the lifecycle filters (\`governance.lifecycle.status\`, \`expires_at\`) that \`_query\` injects automatically; they're what keeps deleted and expired KIs out of results.
- \`remember\`/\`forget\` only work when this AI index has \`memory_enabled: true\`. Don't try to write memory content through any other route.
- \`/internal/context_engine/...\` routes are an internal implementation detail, not a stable public contract. Build new integrations on sources plus the three public routes/tools above.
- Never write a real API key value into a file this agent commits. The MCP config from Step 2 is the one exception, and it must stay untracked.

## Step 5 — Suggest uses tailored to this project

Only if Step 3 found no application code: propose 3-5 concrete places in the user's stack where this AI index would save effort, each tied to a specific operation from the table above. Propose, do not build.
`;
