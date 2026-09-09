# Significant Events Agent Builder

## Core principle

Tools handle what needs to be deterministic (validation, persistence, search) or focused (sub-agent
LLM calls). Reasoning and triage stay with the LLM — tools return rich, structured facts and let the
LLM decide what they mean. Avoid hardcoding domain logic like "if signal X then conclude Y" in
tools; the LLM generalizes better across novel cases than hand-written heuristics.

## Surface

Registered from `register.ts`. Tool ids live in `tools/tool_ids.ts` under the
`platform.sig_events` namespace.

### Tools (`tools/`)

| Group                | Tools                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| Knowledge indicators | `search_knowledge_indicators`, `create_feature_knowledge_indicator`, `create_query_knowledge_indicator` |
| KI identification    | `ki_identification_start`, `ki_identification_cancel`, `ki_identification_status` |
| Events               | `event_search`, `event_create`, `event_write`, `event_status_update`         |
| Discovery            | `discovery_write`                                                            |

`search_knowledge_indicators` is also consumed outside this plugin, by the
`observability_agent_builder` RCA skill.

### Skills (`skills/`)

`knowledge_indicators_management`, `ki_identification_management`, `significant_events_management`,
`significant_events_ki_grounding`. Memory and investigation skills live separately, under
`server/memory_and_investigation/skills/`.

### Agents (`agents/discovery/`)

The discovery agent type and its judge, with instructions in `instructions/*.md.text`.

### Attachments (`attachments/`)

Significant event, detection, and KI feature attachment types, registered for Agent Builder
conversations.

## Guidance channels

The Agent Builder filestore evicts skill content between conversation turns. Any guardrail that must
hold on every turn can't rely solely on skill content — it needs to live in a persistent channel
too. (This eviction behavior is a known platform limitation —
[elastic/search-team#13544](https://github.com/elastic/search-team/issues/13544) tracks addressing
it.)

| Channel                             | Persistence                       | Role                                                           |
| ----------------------------------- | --------------------------------- | -------------------------------------------------------------- |
| Tool descriptions (via `bindTools`) | Every LLM call                    | Primary guardrails: intent gates, cancellation, efficiency     |
| Schema `.describe()`                | Every LLM call                    | Parameter-level guidance                                       |
| Tool result data                    | After invocation                  | Facts with source attribution, status indicators               |
| Skill content                       | Ephemeral (evicted between turns) | Reinforcement: workflows, domain knowledge, reasoning guidance |

**Intent gates for write tools live in tool descriptions, not just the skill.** The skill reinforces
them, but if it gets evicted the tool description is the last line of defense. Same goes for
cancellation handling, deduplication, and efficiency guidance.

Skill content is the right home for multi-step workflows, domain knowledge, result interpretation,
and formatting rules — things that improve quality but where missing them doesn't cause destructive
misuse.
