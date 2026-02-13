# AgentBuilder Evaluations Best Practices

This document contains best practices for writing high-quality evaluations for AgentBuilder skills and tools.

> **📝 Keep This Document Updated**: When you discover new best practices, common pitfalls, or things to avoid while working with evals, update this file immediately. This helps build institutional knowledge for everyone working on evaluations.

---

## Skill Architecture (SkillDefinition)

Skills are the primary mechanism for teaching the agent about domain-specific capabilities. Understanding the architecture helps write better evals.

### New `SkillDefinition` Type

Skills are defined using `defineSkillType` from `@kbn/agent-builder-server/skills/type_definition`:

```typescript
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const MY_SKILL = defineSkillType({
  id: 'platform.search',           // Unique skill ID (must be in AGENT_BUILDER_BUILTIN_SKILLS)
  name: 'search',                  // Short lowercase name
  basePath: 'skills/platform',     // Must match SkillsDirectoryStructure
  description: 'Search and query data via Kibana (read-only)',
  content: `# Platform Search        // Markdown instructions for the agent
...`,
  getAllowedTools: () => [          // References to registered builtin tools
    'platform.core.search',
    'platform.core.execute_esql',
  ],
});
```

### Three Tool Patterns

| Pattern | When to use | Example |
|---------|-------------|---------|
| `getAllowedTools` | Skill delegates to registered builtin tools | `getAllowedTools: () => ['platform.core.search']` |
| `getInlineTools` | Skill has custom tool logic (LangGraph, custom handlers) | Returns `BuiltinSkillBoundedTool[]` |
| No tools | Guidance-only skill (instructions only) | Omit both `getAllowedTools` and `getInlineTools` |

### Skill Registration

Skills are registered via the new API in `register_skills.ts`:

```typescript
// ✅ New API (SkillDefinition)
await agentBuilder.skill.registerSkill(MY_SKILL);

// ❌ Legacy API (old Skill type) - being phased out
agentBuilder.skills.register(legacySkill);
```

### Impact on Evals

- **`expectedOnlyToolId`** should match the **builtin tool IDs** from `getAllowedTools`, not the skill ID. For example, if skill `platform.search` exposes `platform.core.search`, use `expectedOnlyToolId: 'platform.core.search'`.
- **`invoke_skill`** pattern remains the same — the agent calls skills via the `invoke_skill` meta-tool, which the ToolUsageOnly evaluator handles.
- **Skill `content`** is the primary mechanism for controlling agent behavior. When tuning eval scores, update skill `content` markdown (response format instructions, WHEN TO USE sections, FORBIDDEN RESPONSES).
- **Directory structure**: Skills must have a `basePath` matching `SkillsDirectoryStructure` in `type_definition.ts`. Available paths include `skills/platform`, `skills/security`, `skills/security/cases`, `skills/observability`, `skills/fleet`, `skills/ml`, `skills/osquery`, `skills/dashboards`, etc.

### Adding New Skills (Checklist)

1. Define the skill using `defineSkillType` with proper `id`, `name`, `basePath`, `content`
2. Add the skill ID to `AGENT_BUILDER_BUILTIN_SKILLS` in `allow_lists.ts`
3. If the skill uses tools, add tool IDs to `getAllowedTools` (tools must exist in `AGENT_BUILDER_BUILTIN_TOOLS`)
4. Register via `agentBuilder.skill.registerSkill()` in the plugin's `register_skills.ts`
5. If a new directory is needed, extend `SkillsDirectoryStructure` in `type_definition.ts`
6. Write/update evals for the skill (see sections below)

### Legacy Skills (Not Yet Migrated)

Some skills still use the legacy `Skill` type from `@kbn/agent-builder-common/skills`. These are:
- Osquery skills (5) — need `OsqueryAppContext` not available in `ToolHandlerContext`
- `platform.workflow_generation` — LangGraph tool needs `getInlineTools`
- `security.alert_triage`, `security.entity_analytics` — custom tools with direct ES queries

These are registered via the legacy `agentBuilder.skills.register()` API and will be migrated when infrastructure support is available.

---

## Core Principles

### 1. Use the Default Agent When Possible

**Prefer testing with the default agent** (`elastic-ai-agent`) rather than creating custom agents. This ensures you're testing the same experience that users have.

```typescript
// ✅ Good - Uses default agent
evaluate('search operations', async ({ evaluateDataset, chatClient }) => {
  await evaluateDataset({
    dataset: {
      examples: [
        {
          input: { question: 'Search for error logs' },
          output: { expected: '...' },
          metadata: {
            // No agentId - uses default agent
            expectedOnlyToolId: platformCoreTools.search,
          },
        },
      ],
    },
  });
});

// ⚠️ Only create custom agents when necessary (e.g., testing tool isolation)
```

### 2. Write Expected Outputs That Describe Response Content

The **expected output** should describe what a correct response should **contain**, not what the agent should **do**. This is critical for Factuality scoring.

```typescript
// ❌ Bad - Describes what agent does (leads to low Factuality scores)
output: {
  expected: 'Uses the search tool with time range filter for last 24h and query for error logs.',
}

// ✅ Good - Describes what response should contain
output: {
  expected: `The response should contain:
- A summary of error logs found from the last 24 hours
- Log entries showing fields like @timestamp, log.level, and message
- A count or summary of how many errors were found
- Any specific error messages, hosts, or services shown are valid as long as they come from the search results`,
}
```

### 3. Use Flexible Expected Outputs

Allow for variation in agent responses while still validating correctness:

```typescript
// ✅ Good - Flexible expected output
output: {
  expected: `The response should:
- List dashboards with their titles and IDs
- Any number of results is acceptable
- May include additional metadata like creation date or description`,
}

// ❌ Bad - Too specific, will fail if response format differs
output: {
  expected: 'Returns exactly 5 dashboards: Dashboard A, Dashboard B, Dashboard C...',
}
```

### 4. Include Proper Metadata

Always include relevant metadata for evaluators:

```typescript
metadata: {
  // Required for ToolUsageOnly evaluator - specifies the expected tool
  expectedOnlyToolId: platformCoreTools.search,
  
  // Optional - custom metadata for analysis
  category: 'search',
  difficulty: 'basic',
}
```

## Evaluator Selection

### Available Evaluators

| Evaluator | What it measures | When to use |
|-----------|-----------------|-------------|
| `ToolUsageOnly` | Agent uses the correct tool/skill | Always include for tool-specific evals |
| `Factuality` | Response is factually accurate vs expected | When response content matters |
| `Relevance` | Response addresses the user's question | When relevance is important |
| `TokenUsage` | Token consumption and cost estimation | For cost analysis and optimization |
| `Latency` | Response time performance | For performance testing |

### Setting Evaluators

Use the `SELECTED_EVALUATORS` environment variable or set defaults in your spec:

```typescript
// Set default evaluators for your spec
const SPEC_EVALUATORS = ['ToolUsageOnly', 'Factuality', 'Relevance'];
if (!process.env.SELECTED_EVALUATORS) {
  process.env.SELECTED_EVALUATORS = SPEC_EVALUATORS.join(',');
}
```

## Dataset Structure

### Example Structure

```typescript
const dataset = {
  name: 'my-skill: operation-type',
  description: 'Clear description of what this dataset evaluates',
  examples: [
    {
      input: {
        question: 'User question in natural language',
      },
      output: {
        expected: `What a correct response should contain:
- Key point 1
- Key point 2
- Acceptable variations`,
      },
      metadata: {
        expectedOnlyToolId: platformCoreTools.myTool,
        // Additional metadata as needed
      },
    },
  ],
};
```

### Dataset Naming Convention

Use consistent naming: `{skill-name}: {operation-type}`

Examples:
- `platform search: basic operations`
- `platform saved objects: find operations`
- `platform alerting rules: create operations`

## Test Organization

### File Structure

```
evals/
├── AGENTS.md                    # This file
├── platform_search/
│   └── platform_search.spec.ts
├── platform_saved_objects/
│   └── platform_saved_objects.spec.ts
└── ...
```

### Test Grouping

Group related tests under `evaluate.describe()`:

```typescript
evaluate.describe('Platform Search Skill', { tag: '@svlOblt' }, () => {
  evaluate('basic search operations', async () => { /* ... */ });
  evaluate('ES|QL query operations', async () => { /* ... */ });
  evaluate('advanced filtering', async () => { /* ... */ });
});
```

## Running Evaluations

### Quick Start

```bash
# Set up your connector (base64 encoded JSON)
export KIBANA_TESTING_AI_CONNECTORS='<base64-encoded-connectors>'
export EVALUATION_CONNECTOR_ID=<your-connector-id>

# Run the eval
node scripts/playwright test \
  --config x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts \
  evals/platform_search/platform_search.spec.ts \
  --project $EVALUATION_CONNECTOR_ID
```

### With Specific Evaluators

```bash
SELECTED_EVALUATORS=ToolUsageOnly,Factuality node scripts/playwright test ...
```

## Multi-Model Evaluation Workflow (Cross-Model Robustness)

This workflow is for making **skill instructions, tool schemas, and attachment guidance** generic enough to work across different model families/versions, while keeping eval outcomes stable.

### Why parallel multi-model runs

**Do not tune sequentially** (Model A → Model B → re-check A) unless you must. Sequential tuning tends to oscillate: fixes for one model can regress another.

Prefer **parallel** runs so every iteration is evaluated against *all* target models, and you optimize for the weakest one.

### Target models (default)

- `pmeClaudeV45SonnetUsEast1` (Claude 4.5 Sonnet)
- `pmeClaudeV40SonnetUsEast1` (Claude 4.0 Sonnet)

### Phase 1: Best-practices compliance check (required)

Before running any multi-model tuning, verify the spec follows this document’s best practices:

- **Default agent**: use the default agent unless you’re explicitly testing isolation.
- **Expected outputs**: describe *response content*, not tool usage or internal reasoning.
- **Flexibility**: expected outputs should allow valid variation (ordering, counts, formatting).
- **Metadata**: include `expectedOnlyToolId` where ToolUsageOnly is relevant.
- **Tool call expectations**: account for `invoke_skill` indirection (don’t mis-diagnose ToolUsageOnly=0%).

If it fails the above, fix those first—multi-model tuning won’t help if the evaluation design itself is brittle.

### Phase 2: Parallel multi-model evaluation loop

#### 1) Pin the judge (LLM-as-a-judge) model for comparability

Many evaluators (e.g. factuality/relevance/groundedness-style judges) depend on an evaluation model. For **consistent comparisons across runs and across models**, keep the judge constant:

- **Set** `EVALUATION_CONNECTOR_ID` to the judge model connector you want to use consistently.
- **Use** `--project <connectorId>` to choose the model under test.

#### 2) Run the same spec against both models (in parallel)

```bash
# Example: keep the judge fixed, vary the model under test via --project
export EVALUATION_CONNECTOR_ID="pmeClaudeV45SonnetUsEast1"
export SPEC="evals/<your-suite>/<your-spec>.spec.ts"
export CONFIG="x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts"

node scripts/playwright test --config "$CONFIG" "$SPEC" --project "pmeClaudeV45SonnetUsEast1" &
node scripts/playwright test --config "$CONFIG" "$SPEC" --project "pmeClaudeV40SonnetUsEast1" &
wait
```

#### 3) Define “constantly >90%”

Because LLM behavior is stochastic, treat “>90%” as a stability requirement, not a single lucky run:

- **Recommended**: `EVALUATION_REPETITIONS=3` (or 5 for flaky suites), and require:
  - **mean ≥ 0.90** for each evaluator that matters, for each model, and
  - **no systematic single-example failures** (repeatable 0 scores) in low-score explanations.

If you see borderline results, increase repetitions rather than continuing to tweak prompts blindly.

#### 4) Optimize using a “weakest model wins” composite

Use:

```
composite_score = min(score_model_A, score_model_B)
```

Only accept a change when it improves (or at least does not reduce) the composite score and does not introduce new regressions for either model.

### Commands reference (copy/paste)

```bash
# Required inputs
export CONFIG="x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/playwright.config.ts"
export SPEC="evals/<your-suite>/<your-spec>.spec.ts"

# Pin judge model for LLM-as-judge evaluators (recommended)
export EVALUATION_CONNECTOR_ID="pmeClaudeV45SonnetUsEast1"

# Stabilize scores (recommended)
export EVALUATION_REPETITIONS="3"

# Optional: focus on a subset while iterating (example)
# export SELECTED_EVALUATORS="ToolUsageOnly,Factuality,Relevance"

# Run one model under test
node scripts/playwright test --config "$CONFIG" "$SPEC" --project "pmeClaudeV45SonnetUsEast1"

# Run both target models under test (parallel)
node scripts/playwright test --config "$CONFIG" "$SPEC" --project "pmeClaudeV45SonnetUsEast1" &
node scripts/playwright test --config "$CONFIG" "$SPEC" --project "pmeClaudeV40SonnetUsEast1" &
wait
```

### Iteration strategy (generic-first)

When one model is below threshold, follow this order. The intent is to produce **generic instructions** that are robust across models.

1. **Fix evaluation brittleness first**
   - Rewrite expected outputs to be content-focused and flexible.
   - Remove “expects exact phrasing/counts/format”.
2. **Constrain response shape in the skill content**
   - Add a **Response format (CRITICAL)** section with explicit DO/DON’T.
   - Prefer short, structured outputs (lists/tables) over prose.
3. **Clarify tool/skill parameter expectations**
   - Make required parameters explicit (names + acceptable forms).
   - Provide “if missing X, ask for X” behavior (avoid hallucinating tool args).
4. **Reduce ambiguity in user prompts/examples**
   - If the test prompt is intentionally ambiguous, ensure the expected output explicitly allows “ask a clarifying question” as a correct outcome.
5. **Minimize model-dependent phrasing**
   - Avoid “think step by step”, “use chain-of-thought”, or model-specific meta prompting.
   - Prefer behavioral constraints (“return only fields relevant to X”, “no follow-ups unless asked”).

### Model-specific instructions (exception, not the rule)

Only add model/model-family-specific guidance when **all** are true:

- You tried at least **3 iterations** of generic fixes (above), and
- The failure pattern is **consistently model-specific** (one model fails, the other passes), and
- The model-specific instruction is **small, isolated, and documented**.

If needed, isolate model-specific behavior behind a clearly labeled section, and keep it as small as possible:

```markdown
## Model-Specific Notes (EXCEPTION)
### pmeClaudeV40SonnetUsEast1
- If tool parameters are missing, prefer asking a single clarifying question before attempting the tool call.
```

After adding model-specific guidance, re-run **both** models in parallel and ensure the composite score remains ≥ 0.90.

### Interactive Workflow with Cursor Agent

When using Cursor agent for eval development:

1. Run the eval command above
2. Ask Cursor to analyze the results
3. Cursor can fix issues in skills, tools, or expected outputs
4. Re-run to verify improvements

This is more effective than automated feedback loops because Cursor can:
- Understand root causes of low scores
- Make intelligent fixes to skill content
- Update expected outputs appropriately

## Common Pitfalls

### 1. Expected Output Mismatch

**Problem**: Low Factuality scores because expected output describes agent behavior, not response content.

**Solution**: Rewrite expected outputs to describe what the response should contain.

### 2. Missing Tool Metadata

**Problem**: ToolUsageOnly evaluator can't validate tool usage.

**Solution**: Always include `expectedOnlyToolId` in metadata.

### 2b. Factuality Evaluator Too Strict for Action-Oriented Evals

**Problem**: Factuality evaluator compares expected output text against actual response. Even with minimal expected outputs like "Response shows cases", it can fail if the wording doesn't match closely enough. This leads to low scores even when the agent correctly completes the task.

**Solution**: For action-oriented evals (list, search, get operations), consider using only `ToolUsageOnly` and `Relevance`:

```typescript
const SPEC_EVALUATORS = ['ToolUsageOnly', 'Relevance'];
// Factuality excluded - too sensitive for action-oriented tasks
```

**When Factuality works well**:
- Knowledge-based questions with specific expected facts
- Comparing extracted information against a known source
- Validating specific claims in the response

**When to exclude Factuality**:
- Action-oriented tasks (list, search, create, delete)
- Tasks where the response content varies by system state
- Tasks where success is determined by tool usage, not response wording

### 3. Overly Specific Expected Outputs

**Problem**: Tests fail due to minor response variations.

**Solution**: Write flexible expected outputs that allow acceptable variations.

### 4. Agent Uses `invoke_skill` Instead of Direct Tool Calls

**Problem**: The default agent calls skills via `invoke_skill` meta-tool, not direct tool calls. ToolUsageOnly may show 0% even when the agent successfully used the skill.

**Solution**: The ToolUsageOnly evaluator is configured to check `invoke_skill` params for the expected skill name. Example: if expecting `platform.core.search`, the agent may call `invoke_skill` with `params.name: "platform.search"` - this is valid.

### 5. Auxiliary Discovery Tools Are Ignored

**Problem**: Agent may call `grep`, `read_file`, `read_skill_tools` for skill discovery before calling the expected tool.

**Solution**: These auxiliary discovery tools are filtered out by the ToolUsageOnly evaluator. They don't affect the score.

### 6. Base64 Encoding for AI Connectors

**Problem**: `KIBANA_TESTING_AI_CONNECTORS` environment variable errors with "is not valid JSON".

**Solution**: The value must be **base64 encoded**. Encode your connector JSON before setting the env var:

```bash
# Create the JSON and base64 encode it
echo '{"connectorId":{"name":"...","actionTypeId":".bedrock","config":{...},"secrets":{...}}}' | base64
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `KIBANA_TESTING_AI_CONNECTORS` | Base64-encoded JSON with AI connector configs | Yes |
| `EVALUATION_CONNECTOR_ID` | ID of the connector to use for evals | Yes |
| `SELECTED_EVALUATORS` | Comma-separated list of evaluators | No |
| `LANGSMITH_PROJECT_ID` | LangSmith project for trace correlation | No |
| `LANGSMITH_ORG_ID` | LangSmith organization ID | No |

## Debugging Low Scores

### ToolUsageOnly: 0%

1. Check if agent uses `invoke_skill` - this is normal behavior
2. Verify `expectedOnlyToolId` matches the skill name pattern
3. Check tool calls in LangSmith traces

### Factuality: Low Score

1. Review the expected output - does it describe response **content** or agent **behavior**?
2. Check the correctness analysis for "NOT_IN_GROUND_TRUTH" claims
3. Rewrite expected to be flexible and content-focused

### Relevance: Low Score (PARTIALLY_RELEVANT)

Relevance is evaluated based on **claim centrality**:
- **RELEVANT**: Response contains only `central` claims (directly answers the question)
- **PARTIALLY_RELEVANT**: Response answers the core query but includes `peripheral` claims (extra context)
- **IRRELEVANT**: Response is primarily peripheral claims

**Common cause**: Agent adds helpful context, explanations, or follow-up suggestions that aren't part of the query.

**Solution**: Update the **skill content** to instruct more focused responses:

```typescript
// In skill content, add explicit response format instructions:
content: `
## Response format (CRITICAL)
After executing the search, respond **directly and concisely**:

1. State the count of matching results first
2. Show the actual data in a table or list format
3. Include only fields directly relevant to the query

**DO NOT include**:
- Explanations of how the tool works
- Follow-up suggestions unless requested
- Disclaimers or caveats about results

**DO include**:
- The count/summary of results
- The actual data in a clear format
`
```

### 7. Skill Content Controls Response Quality

**Problem**: Agent responses include too much extra context, lowering Relevance scores.

**Solution**: Skills define **how the agent responds**, not just what tools to use. Update skill `content` with explicit response format instructions:

- Add "Response format (CRITICAL)" section
- List explicit DO/DON'T instructions
- Include example response format
- Remove sections that encourage asking clarifying questions or adding context

## Token Usage Tracking

Two evaluators track token consumption from different sources:

| Evaluator | Source | Description |
|-----------|--------|-------------|
| `TokenUsage` | Direct (API) | Extracts tokens from the converse API `model_usage` response |
| `TokenUsage.LangSmith` | LangSmith traces | Fetches token data from LangSmith using the `traceId` |

### What They Track

| Metric | Description |
|--------|-------------|
| `inputTokens` | Number of input/prompt tokens |
| `outputTokens` | Number of output/completion tokens |
| `totalTokens` | Sum of input + output tokens |
| `llmCalls` | Number of LLM calls in the round |
| `model` | Model identifier used |
| `estimatedCostUsd` | Estimated cost (default: $0.003/1K input, $0.015/1K output) |

### Running with Token Tracking

```bash
# Direct approach only (always works)
SELECTED_EVALUATORS=TokenUsage,ToolUsageOnly node scripts/playwright test ...

# Both approaches for comparison (requires LANGSMITH_API_KEY exported)
source .env && export LANGSMITH_API_KEY && \
LANGSMITH_PROJECT_ID=your-project-uuid \
SELECTED_EVALUATORS=TokenUsage,TokenUsage.LangSmith,ToolUsageOnly \
node scripts/playwright test ...
```

### Environment Variables for LangSmith

| Variable | Description | Required |
|----------|-------------|----------|
| `LANGSMITH_API_KEY` | LangSmith API key for authentication (must be exported!) | Yes |
| `LANGSMITH_PROJECT_ID` | Project UUID for filtering runs | Yes |
| `LANGSMITH_ENDPOINT` | LangSmith API endpoint | No (default: api.smith.langchain.com) |

> **Important**: `LANGSMITH_API_KEY` must be **exported** (e.g., `export LANGSMITH_API_KEY`) for Playwright workers to access it.

### Interpreting Results

Both evaluators return `totalTokens` as the score, so you can see actual numbers in the report:

```
╔═══════════════════════════════════╤═══╤════════════════╤══════════════════════╗
║ Dataset                           │ # │     TokenUsage │ TokenUsage.LangSmith ║
╟───────────────────────────────────┼───┼────────────────┼──────────────────────╢
║ platform search: basic operations │ 1 │   mean: 136501 │         mean: 135890 ║
║                                   │   │ median: 136501 │       median: 135890 ║
╚═══════════════════════════════════╧═══╧════════════════╧══════════════════════╝
```

> **Note**: The percentage column may show large values (e.g., `13650100.0%`) because the report multiplies by 100. Focus on the `mean`/`median`/`min`/`max` rows for actual token counts.

### Comparing Sources

Running both evaluators helps validate data consistency:
- **Close values**: Both sources report similar token counts - data is reliable
- **Different values**: Investigate discrepancies (timing differences, caching, etc.)
- **LangSmith returns 0**: Check:
  1. `LANGSMITH_API_KEY` and `LANGSMITH_PROJECT_ID` are set
  2. LangSmith tracing is enabled on the Agent Builder backend
  3. The LangSmith project has runs (check in the LangSmith UI)

### LangSmith Tracing Requirement

The `TokenUsage.LangSmith` evaluator requires LangSmith tracing to be enabled on the Agent Builder backend. Without this, the LangSmith project will be empty and the evaluator will return 0 tokens.

To enable LangSmith tracing, the backend needs to use `@kbn/langchain`'s LangSmith tracer when running the agent. This is typically configured via environment variables like `LANGSMITH_TRACING=true`.

### Use Cases

1. **Cost estimation**: Track per-example and aggregate costs across eval runs
2. **Regression detection**: Identify when changes increase token usage significantly
3. **Optimization targets**: Find high-token examples to optimize
4. **Data validation**: Compare direct vs LangSmith to ensure accuracy

## Checklist for New Evaluations

- [ ] Use default agent unless testing specific tool isolation
- [ ] Expected outputs describe response content, not agent behavior
- [ ] Include `expectedOnlyToolId` in metadata **only for examples that expect tool execution**
- [ ] `expectedOnlyToolId` should be a **builtin tool ID** from `getAllowedTools` (e.g., `'platform.core.search'`), not the skill ID
- [ ] Remove `expectedOnlyToolId` from informational/hypothetical questions
- [ ] Dataset has clear name and description
- [ ] Tests are grouped logically
- [ ] Skill content includes response format instructions (for Relevance)
- [ ] Skill uses `defineSkillType` with proper `id`, `name`, `basePath` (see Skill Architecture section)
- [ ] Skill ID is in `AGENT_BUILDER_BUILTIN_SKILLS` allow list
- [ ] **Use deterministic questions** (see section below)

---

## Deterministic vs Hypothetical Questions

### The Problem with Hypothetical Questions

Hypothetical questions like "What if I try X?" or "What would happen if..." produce **highly variable agent responses**, leading to:
- Low Factuality scores (agent response doesn't match expected output)
- Inconsistent scores between runs
- Difficult-to-maintain expected outputs

### Prefer Deterministic Questions

**Deterministic questions** have predictable outcomes that can be consistently evaluated:

```typescript
// ❌ Bad - Hypothetical, unpredictable response
{
  input: { question: 'What if I search without an index? What error would I get?' },
  output: { expected: 'The agent explains that an index is required...' },
}

// ✅ Good - Deterministic, predictable outcome
{
  input: { question: 'List all cases in the system' },
  output: { expected: `The response contains case information:
- Either a list of cases with their IDs, titles, and status
- Or a message indicating no cases exist
- The listing operation was completed successfully` },
  metadata: { expectedOnlyToolId: platformCoreTools.cases },
}
```

### Types of Deterministic Questions

1. **List operations** - Always produce a list or "no items found"
   - "List all cases"
   - "Show me all connectors"
   - "List available data views"

2. **Search operations** - Always produce results or "no documents found"
   - "Search logs-* for documents from the last hour"
   - "Run ES|QL query: FROM logs-* | LIMIT 5"

3. **Get with valid/invalid IDs** - Predictable success/failure
   - "Get case with ID abc123" (will succeed or report not found)
   - "Get connector with ID nonexistent-xyz" (will report not found)

4. **Create/Update with complete parameters** - Clear success/failure
   - "Create a case titled 'Test Case' with description 'Testing'"

### Expected Output Format for Deterministic Questions

Write expected outputs that describe **what the response contains**, allowing for multiple valid formats:

```typescript
output: {
  expected: `The response contains search results:
- Either documents from the logs-* index with their content
- Or a message indicating no documents were found
- Or an explanation that the index does not exist
- The search operation was attempted`,
}
```

This format:
- Describes content, not behavior
- Allows multiple valid outcomes
- Specifies what MUST be present
- Indicates what variations are acceptable

---

## Waiting for Kibana After Code Changes

### The Problem

When making code changes to skills, tools, or the agent builder backend, Kibana must restart to pick up the changes. Running evals before Kibana is fully ready causes:
- `ECONNREFUSED` errors (Kibana not responding)
- `503 Kibana server is not ready yet` errors
- `No connector found` errors (connector deleted during restart)
- Incomplete or misleading eval results

### How to Wait for Kibana

Before running evals after code changes, verify Kibana is ready:

```bash
# Simple health check - wait until Kibana responds
until curl -s http://localhost:5620/api/status | grep -q '"status":'; do
  echo "Waiting for Kibana..."
  sleep 5
done
echo "Kibana is ready!"
```

Or use a timeout-based approach:

```bash
# Wait up to 2 minutes for Kibana
for i in {1..24}; do
  if curl -s http://localhost:5620/api/status > /dev/null 2>&1; then
    echo "Kibana is ready!"
    break
  fi
  echo "Waiting for Kibana... ($i/24)"
  sleep 5
done
```

### Automated Workflow

When iterating on evals with code changes:

1. Make your code changes
2. **Wait for Kibana to restart** (watch the Kibana terminal for "Server running" or use health check above)
3. Run the eval
4. Analyze results
5. Repeat

### Signs Kibana Is Not Ready

If you see these errors in eval output, wait and retry:

- `ECONNREFUSED` - Kibana process not running yet
- `503 Kibana server is not ready yet` - Kibana starting but not ready
- `No connector found for id` - Connector was deleted during restart
- `Saved object not found` - Database not fully initialized

---

## Informational vs Tool-Execution Examples

### When to Include `expectedOnlyToolId`

Include `expectedOnlyToolId` **only** when the example expects the agent to actually execute a tool:

```typescript
// ✅ Good - Agent should execute the search tool
{
  input: { question: 'Search logs-* for errors in the last hour' },
  output: { expected: 'The response should contain search results...' },
  metadata: { expectedOnlyToolId: platformCoreTools.search },
}

// ✅ Good - Informational question, no tool execution expected
{
  input: { question: 'What parameters are required for the search tool?' },
  output: { expected: 'The response should explain required parameters...' },
  metadata: {}, // No expectedOnlyToolId - this is informational
}
```

### Informational Questions (No Tool Expected)

These types of questions should **NOT** have `expectedOnlyToolId`:

- "What would happen if..." (hypothetical)
- "Explain..." or "Describe..." (educational)
- "What parameters are required for..." (documentation)
- "How does validation work for..." (conceptual)
- Error explanation questions ("I got this error, what does it mean?")

### Tool-Execution Questions (Tool Expected)

These should have `expectedOnlyToolId`:

- "Search for..." / "Find..."
- "List all..." / "Get..."
- "Create..." / "Delete..." / "Update..."
- Direct commands to perform actions

---

## Checklist for New Evaluations (Quick Reference)

- [ ] Use default agent unless testing specific tool isolation
- [ ] Expected outputs describe response content, not agent behavior
- [ ] `expectedOnlyToolId` = builtin tool ID from `getAllowedTools`, not skill ID
- [ ] Only include `expectedOnlyToolId` for tool-execution examples
- [ ] Skill uses `defineSkillType` and is in `AGENT_BUILDER_BUILTIN_SKILLS`
- [ ] Dataset has clear name and description
- [ ] Skill content includes response format instructions (for Relevance)

---

## Improving ToolUsageOnly Scores (Key Findings)

### The Problem: Agent Not Using Tools (ToolUsageOnly = 0%)

Even with well-structured skills, the agent may fail to use tools when:
- Questions are phrased too casually ("What osquery packs are there?")
- The tool/skill name isn't explicitly mentioned
- The question could be answered from general knowledge

### Solution 1: Explicit Tool References in Test Questions

Making test questions explicitly reference the tool dramatically improves ToolUsageOnly:

```typescript
// ❌ Bad - Agent might answer from general knowledge (ToolUsageOnly: 0%)
{
  input: { question: 'What osquery tables are available?' },
  metadata: { expectedOnlyToolId: 'osquery.entrypoint' },
}

// ✅ Good - Explicit tool reference (ToolUsageOnly: 100%)
{
  input: { question: 'Use osquery to get the schema and list all available table names.' },
  metadata: { expectedOnlyToolId: 'osquery.entrypoint' },
}
```

**Patterns that work well:**
- "Use [tool/skill name] to..."
- "Call the [tool] and..."
- "Execute [operation] using [tool]..."
- "Check the [thing] status using [tool]"

### Solution 2: Strict "WHEN TO USE THIS TOOL" Sections in Skills

Add explicit instructions in skill content that trigger tool usage:

```typescript
content: `# My Skill

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user mentions ANY of these:
- "[keyword]" in any context
- Asking about [thing] status, configuration, or availability
- Questions about [specific topics]
- Any request involving [operations]

**CRITICAL: If the question contains the word "[keyword]", you MUST call this tool.**
**NEVER answer a [topic] question without calling the tool first.**

## RESPONSE FORMAT (MANDATORY)
...
`
```

### Solution 3: FORBIDDEN RESPONSES Sections Improve Groundedness

Add explicit examples of what the agent must NOT include:

```typescript
content: `
## FORBIDDEN RESPONSES (will cause evaluation failure)
- "[Topic] is a tool that allows you to..."
- "To configure [thing], you need to..."
- "Let me know if you need help with..."
- Any explanation or description not directly from tool results
- Any setup instructions or suggestions
- Background information about [topic]
`
```

### Solution 4: Focused Evaluators for Action-Oriented Skills

For skills that perform actions (list, search, create), use:

```typescript
const SPEC_EVALUATORS = ['ToolUsageOnly', 'Groundedness', 'Relevance', 'Sequence Accuracy'];
// Factuality excluded - too sensitive for action-oriented tasks where response content varies
```

### Real Results: Osquery Skill Improvement

| Change Applied | ToolUsageOnly Before | ToolUsageOnly After |
|----------------|---------------------|---------------------|
| Added "WHEN TO USE THIS TOOL" section | 0-60% | 100% |
| Made test questions explicit | 0% (query packs) | 100% |
| Added FORBIDDEN RESPONSES section | 40% (Groundedness) | 99.8% |

### Key Insight 1: Question Wording Matters

The same skill can score 0% or 100% based purely on how the question is phrased:

| Question Phrasing | ToolUsageOnly |
|-------------------|---------------|
| "List the osquery packs." | 0% |
| "Use osquery to list all configured packs." | 100% |
| "What osquery tables are available?" | 50% |
| "Use osquery to get the schema and list all available table names." | 100% |

### Key Insight 2: Verify Tool Availability Before Testing

When ToolUsageOnly is 0% and explicit phrasing doesn't help, **verify the tool is available to the agent**:

```typescript
// Check in: x-pack/platform/packages/shared/agent-builder/agent-builder-common/tools/constants.ts
export const defaultAgentToolIds = [
  platformCoreTools.search,
  platformCoreTools.listIndices,
  platformCoreTools.getIndexMapping,
  platformCoreTools.getDocumentById,
  platformCoreTools.getWorkflowExecutionStatus,
];
// Note: indexExplorer is NOT in this list - default agent can't use it!
```

**Real example - Platform Index Explorer issue:**

| Problem | ToolUsageOnly Score |
|---------|---------------------|
| Tests expected `indexExplorer` which was NOT in `defaultAgentToolIds` | 50% (comprehensive), 75% (field types) |
| Changed tests to use `listIndices` (available to default agent) | **100%** |

**Diagnostic steps when ToolUsageOnly is consistently 0%:**
1. Check `defaultAgentToolIds` in `constants.ts` for builtin tools
2. For skills, verify the skill is registered and available
3. Run a focused test with explicit tool reference
4. If still 0%, the tool/skill may not be loaded for the test agent

### Skills Achieving >90% ToolUsageOnly

These patterns have been validated to achieve consistent >90% scores:

| Skill | ToolUsageOnly | Sequence Accuracy | Key Success Factor |
|-------|---------------|-------------------|-------------------|
| Osquery | 100% | 100% | Explicit tool references + strict skill content |
| Platform Generate ES\|QL | 100% | 100% | Dedicated skill with explicit instructions |
| Platform Workflow Generation | 100% | 98.7% | Strong "WHEN TO USE" section |
| Platform Visualization | 90.7% | 100% | Clear response format guidelines |
| Platform Index Explorer | 100% | 100% | Using available tools (listIndices) + explicit questions |

---

## Changelog

Track significant updates to this document:

| Date | Change |
|------|--------|
| 2026-01-30 | Initial creation with core principles, evaluator selection, feedback loop mode, common pitfalls |
| 2026-01-30 | Added `invoke_skill` pattern, auxiliary discovery tools, base64 encoding, debugging tips |
| 2026-01-30 | Added skill content controls response quality - key insight for improving Relevance scores |
| 2026-01-30 | Added `TokenUsage` evaluator for tracking token consumption and cost estimation |
| 2026-01-30 | Added `TokenUsage.LangSmith` evaluator for comparing token data from LangSmith traces |
| 2026-01-30 | Added multi-model eval workflow (parallel optimization across `pmeClaudeV45SonnetUsEast1` + `pmeClaudeV40SonnetUsEast1`) |
| 2026-01-30 | Added "Waiting for Kibana After Code Changes" section - always wait for Kibana to restart before running evals |
| 2026-01-30 | Added "Informational vs Tool-Execution Examples" - clarified when to include/exclude `expectedOnlyToolId` |
| 2026-01-30 | Added "Deterministic vs Hypothetical Questions" - key insight for achieving >90% scores consistently |
| 2026-01-30 | Added guidance on Factuality evaluator sensitivity - consider excluding for action-oriented evals |
| 2026-01-31 | Added "Improving ToolUsageOnly Scores" section - explicit tool references, strict skill content, FORBIDDEN RESPONSES |
| 2026-02-01 | Added "Verify Tool Availability" insight - fixed Platform Index Explorer (listIndices instead of unavailable indexExplorer) |
| 2026-02-13 | Added "Skill Architecture (SkillDefinition)" section documenting new `defineSkillType` pattern, `getAllowedTools`/`getInlineTools`, directory structure, registration API, and impact on evals |
