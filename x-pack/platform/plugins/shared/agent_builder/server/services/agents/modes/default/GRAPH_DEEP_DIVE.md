# Agent Graph — Deep Dive

This document explains how `graph.ts` works in detail, with a Data Science lens. The goal is to build an accurate mental model of the control flow, the state that flows through it, and the design decisions behind it.

---

## The big picture: it's a finite state machine over an append-only log

The graph is a **LangGraph `StateGraph`** — a directed graph where nodes are async functions and edges (including conditional ones) decide what to execute next. The key insight for a data scientist is:

> **The state is an append-only log of actions. Each node reads the log, decides what to do next, and appends new entries.**

This is the same mental model as an event-sourced system or a sequence of transformer layers where each layer's output feeds the next. There is no mutable shared object being patched — only new actions appended via LangGraph's reducer semantics.

---

## State (`state.ts`)

```typescript
StateAnnotation = {
  cycleLimit: number,          // input: max research cycles allowed (default 10, run sets it to 15)
  currentCycle: number,        // counter: incremented after each researchAgent call
  errorCount: number,          // counter: successive recoverable errors (reset on success)
  mainActions: ResearchAgentAction[],   // log of research-phase actions (appended, never overwritten)
  answerActions: AnswerAgentAction[],   // log of answer-phase actions (appended, never overwritten)
  interrupted: boolean,        // output: true if graph halted mid-cycle for HITL
  prompts: PromptRequest[],    // output: human-in-the-loop prompts awaiting user input
  finalAnswer: string | object // output: the agent's response
}
```

The **reducer for `mainActions` and `answerActions` is `(a, b) => [...a, ...b]`** — a pure append. Every node that returns `{ mainActions: [newAction] }` is extending the log, not replacing it. This means each node always has the full history of what happened before it.

---

## Action types (`actions.ts`)

Actions are a **tagged union** (discriminated union) — think of them as the `dtype` of each row in the action log:

| Action type | Phase | Meaning |
|------------|-------|---------|
| `tool_call` | Research | The LLM decided to call one or more tools |
| `execute_tool` | Research | The tools ran and returned results |
| `tool_prompt` | Research | A tool triggered a Human-in-the-Loop interrupt |
| `hand_over` | Research | The LLM decided it has enough data; passes context to the answer agent |
| `answer` | Answer | The answer agent produced a natural language response |
| `structured_answer` | Answer | The answer agent produced a typed JSON object |
| `error` | Either | A recoverable LLM error occurred (rate limit, empty response, etc.) |

The nodes in `graph.ts` inspect `state.mainActions[state.mainActions.length - 1]` — the **last action** — to decide what to do next. This is exactly the same pattern as reading the last row of a time-ordered event log.

---

## Graph topology

```
START
  │
  ▼
[init]
  │ (always)
  ▼
[researchAgent] ◄──────────────────────────────┐
  │                                             │
  │ → action type?                              │
  ├─ tool_call + cycle < limit ──► [executeTool]│
  │                                    │        │
  │                                    │ → HITL?│
  │                                    ├─ yes ──► [handleToolInterrupt] ──► END (suspended)
  │                                    │
  │                                    └─ no ───────────────────────────────┘ (loops back)
  │
  ├─ tool_call + cycle >= limit ──► [prepareToAnswer]
  ├─ hand_over ──────────────────► [prepareToAnswer]
  └─ error (≤ 2 successive) ──────► [researchAgent] (retry)
       error (> 2 successive) ──────► THROW

  [prepareToAnswer]
  │ (always)
  ▼
[answerAgent] ◄──────────────────────────────┐
  │                                           │
  │ → action type?                            │
  ├─ answer / structured_answer ──► [finalize]│
  └─ error (≤ 2) ─────────────────────────────┘ (retry)
       error (> 2) ──────────────────────────► THROW

  [finalize]
  │
  ▼
END
```

---

## Node-by-node walkthrough

### `init`

A no-op that exists to give LangGraph a concrete entry point after the `START` pseudo-node. Returns `{}` — no state changes.

### `researchAgent`

The core of the loop. This is the **LLM call with tools bound**.

```typescript
const researcherModel = chatModel.bindTools(toolManager.list())
```

`bindTools` is the key step: it serialises all registered tool schemas (name, description, Zod parameter schema → JSON Schema) and sends them in the LLM request as the `tools` array. The LLM then decides whether to call tools or produce a text response.

After the LLM call, `processResearchResponse` (in `action_utils.ts`) parses the `AIMessageChunk` into one action. See the next section for the full breakdown.

The `currentCycle` counter is incremented here (not in `executeTool`). This means the cycle budget counts **LLM decisions**, not tool executions.

### `processResearchResponse` — parsing the LLM response

The function receives one `AIMessageChunk` — the complete LLM response as a single LangChain message object. That object can carry two things simultaneously:

- `message.content` — any text the model wrote (string, or typed content blocks for multimodal models)
- `message.tool_calls` — an array of tool call objects, each with `{ id, name, args }`

It parses them into exactly one of three action types:

#### Branch 1: `tool_calls.length > 0` → `ToolCallAction`

```typescript
return toolCallAction(
  extractToolCallsWithReasoning(message),
  textContent.trim().length ? textContent : undefined
);
```

`extractToolCallsWithReasoning` does two things. First, `extractToolCalls` maps each raw LangChain tool call to a typed struct:

```typescript
{ toolCallId: toolCall.id, toolName: toolCall.name, args: toolCall.args }
```

Second, it looks for a special key `_reasoning` inside `args` and strips it out before returning:

```typescript
const { _reasoning, ...toolCallArgs } = toolCall.args ?? {};
return { ...toolCall, args: toolCallArgs, reasoning: _reasoning };
```

That `_reasoning` key was **intentionally injected** into every tool's schema at registration time, in `toolToLangchain` (`langchain/tools.ts`):

```typescript
schema: z.object({
  _reasoning: z.string().optional()
    .describe('Brief reasoning of why you are calling this tool'),
  ...schema.shape,   // ← the tool's actual parameters
})
```

So every tool the model sees has an extra optional `_reasoning` field. The model uses it as a lightweight scratchpad — e.g. "I'm calling `execute_esql` because the user asked for the top 10 errors in the last hour". The reasoning is stripped from `args` before reaching the tool handler (no tool ever sees it), but it is preserved in the action as `ToolCallWithReasoning.reasoning`, where it is available for prompts, tracing, and the UI.

The second argument to `toolCallAction` is any text the model wrote alongside the tool calls. Some models (e.g. Claude) emit a text block before the tool call JSON. That text is attached to the `ToolCallAction` as `message` and later serialised into the prompt history so the answer agent sees the model's chain of thought.

#### Branch 2: no tool calls, has text → `HandoverAction`

```typescript
if (textContent) {
  return handoverAction(textContent);
}
```

The model decided it has gathered enough information and wrote a plain text response instead of calling tools. That text becomes the **handover note** — the research agent's briefing to the answer agent. The graph will route to `prepareToAnswer`.

#### Branch 3: no tool calls, no text → `AgentErrorAction`

```typescript
return errorAction(
  createAgentExecutionError('agent returned an empty response', AgentExecutionErrorCode.emptyResponse, {})
);
```

The model returned neither tool calls nor text. This is treated as a recoverable error: the edge router sends execution back to `researchAgent` to retry, up to `MAX_ERROR_COUNT = 2` times.

#### Decision table

| `tool_calls.length` | `textContent` | Result |
|--------------------|--------------|--------|
| > 0 | any | `ToolCallAction` — tool names + args (`_reasoning` stripped into separate field), optional text |
| 0 | non-empty | `HandoverAction` — research phase ends, text is the briefing for the answer agent |
| 0 | empty | `AgentErrorAction` — retried up to 2 times |

### `researchAgentEdge` (conditional router)

The decision function after `researchAgent`. Think of it as a `switch` on the last action type:

```
last action type
  error         → retry researchAgent (up to MAX_ERROR_COUNT = 2 times)
  tool_call     → executeTool  (unless cycleLimit exceeded → prepareToAnswer)
  hand_over     → prepareToAnswer
  (anything else) → throw invalidState
```

The **cycle limit check** happens here, not inside `researchAgent`. If `currentCycle > cycleLimit` (default 15) at the moment the LLM wants to call another tool, the router short-circuits to `prepareToAnswer` instead — forcing the answer agent to synthesize from whatever was gathered so far.

### `executeTool`

Runs all the tool calls the LLM requested in the last `tool_call` action. It uses LangChain's **`ToolNode`**, which handles parallel execution natively: all tool calls in a single LLM response are executed concurrently.

`processToolNodeResponse` (in `action_utils.ts`) then partitions the results:
- **Completed tools** → `execute_tool` action (results in the action log, fed back to the LLM)
- **HITL-interrupted tools** → `tool_prompt` action (graph suspends, prompts surface to the user)

Both can coexist in a single round: if the LLM called three tools and one triggered HITL while two completed, the two completed results land in `execute_tool` and the one interrupt lands in `tool_prompt`.

### `handleToolInterrupt`

Sets `state.interrupted = true` and surfaces the prompts that need user answers. The graph then terminates at `END` — but this is a **soft termination**. The conversation round is persisted with status `awaitingPrompt`. When the user provides answers, a new request resumes execution from `executeTool` with the prior state restored (see the HITL resume logic in `run_chat_agent.ts`).

### `prepareToAnswer`

A transition node between the research phase and the answer phase. Its only job: if the cycle limit was hit while the LLM still wanted to call tools (the last action is not a `hand_over`), inject a synthetic **forceful `hand_over`** action — `handoverAction('', true)`. This signals to the answer agent that the research was cut short.

If the last action was already a natural `hand_over`, this node is a pass-through (`return {}`).

### `answerAgent`

The **second LLM call**, this time with **no tools bound** (`chatModel.withConfig(...)` without `bindTools`). The model sees:
- System prompt: answer-agent persona (no tools, synthesize from gathered information)
- The full conversation history (prior rounds, compacted if long)
- The entire `mainActions` log formatted as messages — every tool call, every tool result, the handover note

`processAnswerResponse` parses the output:
- Text content → `answer` action
- If the model unexpectedly emits tool calls (a known failure mode with some providers) → `error` action (recoverable: the error is fed back as a failed tool result and the answer agent retries)
- Empty response → `error` action

### `answerAgentStructured`

An alternative to `answerAgent`, selected when `structuredOutput = true`. Instead of `model.invoke`, it uses `model.withStructuredOutput(outputSchema)` — the LLM is constrained to produce a JSON object matching the provided schema. The result is a `structured_answer` action containing the parsed object. This mode is used when callers need typed data rather than prose (e.g., tools that call sub-agents expecting structured results).

### `finalize`

Extracts the final answer from the last action in `answerActions` and writes it to `state.finalAnswer`. The distinction between `answer` (string) and `structured_answer` (object) is preserved here.

---

## The two-agent pattern: why separate research from answering?

This is a deliberate architectural choice. A single LLM call that both calls tools and generates the final answer creates a tension:

- **Tool-calling mode** needs the model in "explore and gather" mode: prefer parallel calls, follow leads, don't commit to an answer prematurely.
- **Answering mode** needs the model in "synthesize and communicate" mode: no tools, confident prose, formatted for the end user.

By separating them into two LLM calls with different system prompts and different tool bindings, each call is optimised for its purpose. The research agent's handover note acts like a structured summary passed between two specialised models — similar to a cascade architecture in ML.

---

## Parallel tool calls

When the LLM emits multiple tool calls in a single response (which it can when tools have independent inputs), `ToolNode` executes them **concurrently**. The action log then contains a single `tool_call` entry with multiple tool calls, followed by a single `execute_tool` entry with multiple results. This is equivalent to vectorised operations vs. a Python loop — one round-trip to the LLM, one concurrent execution batch.

The research agent's system prompt explicitly instructs the model: _"When multiple tool calls have independent inputs, you SHOULD call them in parallel in a single turn."_

---

## Error recovery

Both `researchAgent` and `answerAgent` implement the same retry pattern:

1. On a recoverable error (rate limit, context overflow, empty response), return `{ mainActions: [errorAction(e)] }` and increment `errorCount`.
2. The conditional edge routes back to the same node (retry).
3. After `MAX_ERROR_COUNT = 2` successive recoverable errors, throw — the graph terminates with an error.
4. On a successful response, `errorCount` is reset to 0.

"Successive" is key: a single bad LLM call between two good ones doesn't accumulate toward the limit.

---

## Cycle limit and the `CYCLE_LIMIT` constant

`CYCLE_LIMIT = 15` is set in `run_chat_agent.ts` and passed as `cycleLimit` in the initial state. The check `currentCycle > cycleLimit` in `researchAgentEdge` forces `prepareToAnswer` if the research agent is still requesting tool calls after 15 cycles.

LangGraph also has its own `recursionLimit` (a node-traversal budget). `run_chat_agent.ts` computes this as `cycleLimit * 2 + 8` to account for the two nodes per cycle (researchAgent + executeTool) plus the overhead nodes (init, prepareToAnswer, answerAgent, finalize).

---

## HITL resume

When a conversation round is persisted with status `awaitingPrompt`, the next request picks up where execution left off. In `run_chat_agent.ts`, `createInitializerCommand` checks whether the last round is `awaitingPrompt`:

```typescript
if (lastRound?.status === ConversationRoundStatus.awaitingPrompt) {
  initialState.mainActions = roundToActions({ round: lastRound, toolIdMapping });
  startAt = steps.executeTool;  // skip init + researchAgent, jump straight to executeTool
}
```

The prior state (`currentCycle`, `errorCount`, `mainActions`) is restored from the persisted round, and execution resumes from `executeTool` with the user's answers injected as tool results. The graph treats this as if the tool call had just completed.

---

## Context compaction

Before the graph starts, `run_chat_agent.ts` runs `compactConversation`. This is a pre-pass (not part of the graph) that checks whether the conversation history exceeds the model's context budget. If it does, an LLM call summarises the oldest rounds into a `compactionSummary`, which replaces those rounds in the prompt. The graph then operates on the compacted conversation. This is analogous to a sliding window over a time series: old data is compressed into a sufficient statistic, the recent context is kept verbatim.

---

## Files at a glance

| File | Role |
|------|------|
| `graph.ts` | The LangGraph `StateGraph` definition — nodes and edges |
| `state.ts` | State schema and LangGraph `Annotation` reducers |
| `actions.ts` | Tagged union of all action types + type guards + constructors |
| `action_utils.ts` | Parses raw LLM responses into actions; splits tool results into completed vs. HITL |
| `run_chat_agent.ts` | Entry point: tool selection, compaction, HITL resume, graph instantiation and streaming |
| `prompts/research_agent.ts` | System prompt for the research agent |
| `prompts/answer_agent.ts` | System prompt for the answer agent |
| `prompts/prompt_factory.ts` | Assembles the full message array per node invocation |
| `answer_agent_structured.ts` | Structured-output variant of the answer agent |
| `convert_graph_events.ts` | Transforms raw LangGraph stream events into Agent Builder `ChatAgentEvent`s |
| `constants.ts` | Step names and LangChain tags (used for tracing) |
