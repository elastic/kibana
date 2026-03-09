---
name: build-data-source
description: End-to-end orchestrator that creates a new Workplace AI data source from scratch, reviews the code, activates it in Kibana, tests it via an Agent Builder agent, iterates until quality is met, and delivers a polished result. Use when asked to build, develop, or implement a complete data source.
allowed-tools: Bash, Read, Glob, Grep, Write, Edit, Skill
argument-hint: [3rd-party-data-source-name]
---

# Build a Data Source End-to-End

This skill orchestrates the full lifecycle of building a new Workplace AI data source for **$ARGUMENTS**. It chains together multiple skills and performs code review and quality verification between each stage.

## Step 0: Create the Task List

Use `TaskCreate` to create all of the following tasks up front so the user can see the full plan. Set all tasks to `pending` initially.

1. **Create the data source code** — "Generate connector spec, workflows, and data source YAML for $ARGUMENTS"
2. **Code review** — "Review generated data source files for correctness and completeness"
3. **Edit based on review** — "Fix issues found during code review"
4. **Wait for Kibana** — "Ask user to start Elasticsearch and Kibana"
5. **Activate the data source** — "Register the data source in running Kibana"
6. **Create a test agent** — "Create an Agent Builder agent wired to the new data source tools"
7. **Chat test** — "Send a test message to the agent and observe tool calls"
8. **Verify tool call quality** — "Analyze chat results for successful tool executions"
9. **Iterate on quality** — "Fix code issues and re-test until quality bar is met"
10. **Final code review** — "Final review of all generated files"
11. **Final chat test** — "Final end-to-end conversation to confirm everything works"
12. **Report completion** — "Tell the user the data source is ready for manual inspection"

Set up dependencies: task 2 is blocked by 1, task 3 by 2, task 4 by 3, and so on sequentially.

Then begin working through the tasks in order.

---

## Task 1: Create the Data Source Code

Mark task 1 as `in_progress`.

Invoke the `create-data-source` skill with `$ARGUMENTS` as the argument:

```
Skill: create-data-source
Args: $ARGUMENTS
```

This runs in a forked context and will generate:
- A connector specification code bundle (in `src/platform/packages/shared/kbn-connector-specs/src/specs/`)
- Documentation for the connector (in `docs/reference/connectors-kibana/`)
- A data source definition and Workflow YAML files (in `x-pack/solutions/workplace_ai/packages/data_sources/src/data_sources/`)

When complete, mark task 1 as `completed`.

---

## Task 2: Code Review

Mark task 2 as `in_progress`.

Read all the files generated in Task 1 and review them for:

### Connector Spec
- If MCP-based: the generated spec export in `all_specs.ts` has been **removed** (MCP connectors with empty `actions: {}` crash Kibana)
- If MCP-based: `minimumLicense` is `'enterprise'` (not `'basic'`)
- If non-MCP: valid structure with required fields, correct auth type
- Look at existing specs for patterns: `src/platform/packages/shared/kbn-connector-specs/src/specs/`

### Workflows
- Valid workflow YAML with correct step types
- Proper Liquid templating syntax (no malformed `{{ }}` expressions)
- **MCP tool names use underscores** (e.g., `tavily_search`), NOT hyphens — verify against MCP server docs or `listTools`
- Only pass parameters that the MCP tool actually accepts (check the tool's `inputSchema` — some params in third-party docs may be outdated or unavailable via MCP)
- Look at existing workflows for patterns in `x-pack/platform/plugins/shared/data_sources/server/sources/`

### Data Source Definition
- Correct references to the connector spec and workflows
- `importedTools` array uses correct MCP tool names (underscores, not hyphens)
- All workflows referenced actually exist
- Look at existing data sources for patterns in `x-pack/platform/plugins/shared/data_sources/server/sources/`

### Documentation
- Generator scaffold docs are filled in (no remaining `TODO:` placeholders)
- `docs/reference/connectors-kibana/_snippets/elastic-connectors-list.md` description filled in
- `docs/reference/toc.yml` entry exists in the correct section

List all issues found. If no issues are found, note that the code looks good.

Mark task 2 as `completed`.

---

## Task 3: Edit Based on Review

Mark task 3 as `in_progress`.

If issues were found in Task 2, fix them using the `Edit` tool. After fixing, re-read the files and verify the fixes are correct.

If the fixes are significant, do another review pass. Repeat the review/edit cycle until you're satisfied with the quality — typically 1-2 iterations.

Mark task 3 as `completed`.

---

## Task 4: Wait for Kibana

Mark task 4 as `in_progress`.

Use `AskUserQuestion` to ask the user to start Elasticsearch and Kibana:

> To test the data source, I need Elasticsearch and Kibana running. Please start them if they aren't already:
>
> ```
> yarn es snapshot          # in one terminal
> yarn start                # in another terminal
> ```
>
> Let me know when both are ready.

Wait for the user's confirmation. Once confirmed, verify by running:

```bash
x-pack/platform/plugins/shared/data_sources/.claude/skills/activate-data-source/scripts/list_types.sh
```

If this fails, tell the user Kibana isn't reachable yet and ask them to try again.

Mark task 4 as `completed`.

---

## Task 5: Activate the Data Source

Mark task 5 as `in_progress`.

Invoke the `activate-data-source` skill:

```
Skill: activate-data-source
Args: $ARGUMENTS
```

This will list available types, ask the user for credentials, and register the data source via the Kibana API.

**IMPORTANT:** When the skill asks for a display name, use a **lowercase** name (e.g., `"tavily"`, not `"Tavily"`). The name is used as the MCP tool namespace and must match the regex `^[a-z0-9][a-z0-9_-]*[a-z0-9]$`.

Mark task 5 as `completed`.

---

## Task 6: Create a Test Agent

Mark task 6 as `in_progress`.

Invoke the `create-agent` skill:

```
Skill: create-agent
Args: $ARGUMENTS Agent
```

When the skill asks for tool selection, suggest including **all data source tools** for the newly activated source (and no platform tools, to keep the test focused).

Mark task 6 as `completed`.

---

## Task 7: Chat Test

Mark task 7 as `in_progress`.

Invoke the `chat-with-agent` skill to test the agent. Use the agent ID created in Task 6. The default prompt should be:

> Summarize the data available to you through your tools.

```
Skill: chat-with-agent
Args: <agent-id-from-task-6>
```

Capture and analyze the full output (reasoning, tool calls, tool results, response).

Mark task 7 as `completed`.

---

## Task 8: Verify Tool Call Quality

Mark task 8 as `in_progress`.

Analyze the chat output from Task 7. Check each criterion:

### Success Criteria
- [ ] **Tool calls executed**: The agent attempted to use the data source tools
- [ ] **No execution failures**: Tool results do NOT contain `"status":"failed"` (unless the failure is due to auth/credential issues, which are not code problems)
- [ ] **Meaningful results**: Tool results contain actual data, not empty arrays or error messages
- [ ] **Coherent response**: The agent's final response makes sense and references the data

### Failure Analysis
If tools failed (tool results contain `"status":"failed"`):
1. **Get the execution details** to see the actual error. Extract the `execution_id` from the tool result and call:
   ```bash
   source "$(git rev-parse --show-toplevel)/scripts/kibana_api_common.sh" && kibana_curl "$KIBANA_URL/api/workflowExecutions/<execution_id>" > /tmp/wf_exec.json
   ```
   Then read `/tmp/wf_exec.json` and check `error.message` and `stepExecutions[].error.message`.
2. **Common errors:**
   - `Unknown tool: 'tool-name'` — MCP tool name is wrong (likely hyphens vs underscores). Verify via `listTools` sub-action on the connector.
   - `Unexpected keyword argument` — the workflow passes a parameter the MCP tool doesn't accept. Remove it from the workflow YAML.
   - `Input should be 'X'` — a parameter value is invalid (e.g., sending `"news"` when only `"general"` is accepted). Fix the workflow input constraints.
   - Auth/credential errors — note this but don't count as code failure. Ask user to re-provide credentials.
3. If the error is a **workflow issue** (wrong tool name, invalid parameters, bad Liquid template) — this needs code fixes.
4. If the error is a **connector issue** (wrong auth config, wrong MCP server URL) — this needs code fixes.

Mark task 8 as `completed` and note whether iteration is needed.

---

## Task 9: Iterate on Quality

Mark task 9 as `in_progress`.

If Task 8 found code issues:

1. **Diagnose**: Identify which files need changes (connector spec, workflows, or data source definition)
2. **Verify MCP tool names**: If the error involved unknown tools or invalid parameters, use the `listTools` sub-action to discover actual tool names and schemas:
   ```bash
   source "$(git rev-parse --show-toplevel)/scripts/kibana_api_common.sh" && kibana_curl -X POST -H "Content-Type: application/json" \
     "$KIBANA_URL/api/actions/connector/<connector_id>/_execute" \
     -d '{"params":{"subAction":"listTools","subActionParams":{}}}'
   ```
   The connector ID can be found in the workflow execution details. Update `importedTools` in `data_type.ts` and `name` fields in workflow YAMLs to match exact MCP tool names.
3. **Fix**: Use `Edit` to fix the identified issues
4. **Re-activate**: The data source needs to be deleted and re-created (to pick up changed workflows). Wait ~60 seconds for Kibana to hot-reload server-side changes, then run:
   ```bash
   x-pack/platform/plugins/shared/data_sources/.claude/skills/activate-data-source/scripts/list_sources.sh
   ```
   If the old source exists, note its ID. Then re-invoke `/activate-data-source`.
4. **Re-test**: Run another chat test using `/chat-with-agent`
5. **Re-verify**: Check tool call quality again

Repeat this loop up to 3 times. If issues persist after 3 iterations, report the remaining problems to the user and move on.

If Task 8 found NO code issues, skip this task entirely.

Mark task 9 as `completed`.

---

## Task 10: Final Code Review

Mark task 10 as `in_progress`.

Do one final review pass over all generated/modified files:
- Connector spec
- All workflow YAML files
- Data source definition YAML

Verify:
- No leftover TODOs or placeholder values
- Consistent naming conventions
- Clean code with no debugging artifacts

Make any final minor fixes if needed.

Mark task 10 as `completed`.

---

## Task 11: Final Chat Test

Mark task 11 as `in_progress`.

Run one final chat conversation to confirm everything works end-to-end:

```
Skill: chat-with-agent
Args: <agent-id>
```

Use a more specific prompt this time, something like:
> Search for recent items and give me a detailed summary of what you find.

Verify the agent successfully calls tools, gets results, and produces a useful response.

Mark task 11 as `completed`.

---

## Task 12: Report Completion

Mark task 12 as `completed`.

Tell the user something like the below template, listing the actual file paths that were created or modified during the process:

> The **$ARGUMENTS** data source is ready for manual inspection. Here's what was created:
>
> **Files created/modified:**
> - Connector spec: `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/...`
> - Workflows: `x-pack/solutions/workplace_ai/packages/workflows/src/workflows/<name>/...`
> - Data source: `x-pack/solutions/workplace_ai/packages/data_sources/src/data_sources/<name>/...`
>
> **Kibana state:**
> - Data source activated with ID: `<id>`
> - Test agent created with ID: `<id>`
> - Test conversations available in Agent Builder
>
> **Next steps:**
> 1. Open Kibana and navigate to the Agent Builder to inspect the agent
> 2. Try chatting with the agent in the Kibana UI
> 3. Review the generated code and adjust as needed
> 4. When satisfied, commit the code changes

List the actual file paths that were created or modified during the process.
