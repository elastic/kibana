# Streams Agent Builder

## Core principle

Tools handle what needs to be deterministic (validation, simulation, hierarchy traversal) or focused (sub-agent LLM calls). Reasoning and triage stay with the LLM — tools return rich, structured facts and let the LLM decide what they mean. Avoid hardcoding domain logic like "if error X then suggest fix Y" in tools; the LLM generalizes better across novel cases than hand-written heuristics.

## Tool design

Every tool call is an LLM roundtrip. A 1-to-1 mapping between tools and REST API operations means simple questions like "is my stream healthy?" take 3–5 sequential calls before the user sees anything — each one adding seconds of latency. It also forces the agent to manually traverse the wired stream hierarchy, which it does incorrectly. Tools are consolidated around agent tasks instead, so most user questions can be answered in one or two calls.

- **`inspect_streams` is aspect-based.** Callers select which facets to return (overview, schema, quality, lifecycle, processing, routing). This avoids blowing past context limits when inspecting many streams, and lets the agent answer overview questions in a single call without fetching data it won't use.
- **Hierarchy is resolved server-side with source attribution.** `inspect_streams` returns the complete inherited processing chain and field mappings, annotated with which ancestor defines each entry. The agent never traverses the tree — which would mean one call per ancestor.
- **`diagnose_stream` is time-windowed.** Error groups include `first_seen`/`last_seen` timestamps. Without temporal context the agent treats every error as equally urgent, chases stale errors that have already resolved, and burns multiple tool calls trying to fix problems that don't exist anymore.

## Pipeline design as a sub-agent

The Streamlang DSL has 24 processor types, recursive conditional blocks, and typed field references. Embedding the full schema (~7,650 tokens) in the main agent's tool definitions would pollute its context with detail irrelevant to triage and goal tracking. `design_pipeline` delegates Streamlang generation to a focused sub-agent call with a constrained context (grammar, processor catalog, examples).

The sub-agent is **mutation-aware** — it fetches the stream's current pipeline and schema internally, applies the described change, and returns the complete proposed pipeline. If the main agent is given the building blocks to assemble pipelines itself, it takes the laziest path (e.g. dumping a full pipeline description in a single call) rather than composing steps correctly.

Every proposal is **simulated** against sample documents before returning. A 0% success rate surfaces immediately, before changes can reach the stream.

## Write tool design

**Full replacement, not patches.** `update_stream` accepts the complete pipeline array. Patch operations with content-based step matchers don't work — LLMs can't reliably construct matchers that target steps inside nested conditional blocks.

**Two-schema pattern.** Kibana's `resolveToolSchema` strips `$defs` from JSON Schema, breaking `$ref` pointers that Zod v4 generates for unions and recursive types. Gemini doesn't support `anyOf` at all. So tool schemas presented to the LLM use simplified flat structures, and the handler validates against the real Streamlang schema before applying. The tradeoff is schema duplication — adding a new processor type means updating both the flat tool schema and the Streamlang Zod schema.

**Write serialization.** `StreamsWriteQueue` serializes concurrent write operations on the same Kibana node to avoid contention on the global streams lock. Cross-node serialization is handled by the Streams API's distributed lock.

## Guidance channels

The Agent Builder filestore evicts skill content between conversation turns. Any guardrail that must hold on every turn can't rely solely on skill content — it needs to live in a persistent channel too. (This eviction behavior is a known platform limitation — [elastic/search-team#13544](https://github.com/elastic/search-team/issues/13544) tracks addressing it.)

| Channel                             | Persistence                       | Role                                                           |
| ----------------------------------- | --------------------------------- | -------------------------------------------------------------- |
| Tool descriptions (via `bindTools`) | Every LLM call                    | Primary guardrails: intent gates, cancellation, efficiency     |
| Schema `.describe()`                | Every LLM call                    | Parameter-level guidance                                       |
| Tool result data                    | After invocation                  | Facts with source attribution, status indicators               |
| Skill content                       | Ephemeral (evicted between turns) | Reinforcement: workflows, domain knowledge, reasoning guidance |

**Intent gates for write tools live in tool descriptions, not just the skill.** The skill reinforces them, but if it gets evicted the tool description is the last line of defense. Same goes for cancellation handling, deduplication, and efficiency guidance.

Skill content is the right home for multi-step workflows, domain knowledge, result interpretation, and formatting rules — things that improve quality but where missing them doesn't cause destructive misuse.
