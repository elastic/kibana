# Design — External Deductive AI execution for Agent Builder

**Status: implemented · in use for internal dogfooding · temporary bridge**
Owner: normzhou · Internal feature (no public docs).

> ⚠️ **This is a temporary solution.** It exists so we can dogfood Deductive AI from inside
> Kibana's Agent Builder while the Deductive codebase is still external. The long-term goal is
> to move the Deductive engine into Kibana; once that lands, delete this whole integration (see
> [Removal](#removal)).

## What it does

Route the built-in `deductive.ai` agent's conversations to the external Deductive backend while
preserving the normal Agent Builder chat experience: same routes, streaming UI, conversation
persistence, multi-turn. Everything threads through the existing `runAgent` seam; **non-Deductive
agents are untouched** (default path is byte-for-byte unchanged).

## How it flows

```
converse(agent_id: "deductive.ai")
  → runAgent(params, context)
      shouldUseDeductive(agentId)  // fixed equality: agentId === "deductive.ai"
        → runDeductiveAgent(params, context)      ← new module
        else → runDefaultAgentMode(...)           ← unchanged
```

`runDeductiveAgent` (in `run_agent/deductive/run_deductive_agent.ts`):

1. **Session continuity** — reads `conversation.metadata.deductive_session_id`; creates a
   Deductive session on turn 1, reuses it on turn 2+, and persists the id back via
   `conversationClient.update()` (arbitrary metadata, no template needed — unlike
   `patchMetadata`).
2. **Call Deductive** — via `run_agent/deductive/deductive_client.ts` (raw SSE over `fetch`),
   with session-unavailable (404/403/410) recovery that mints a fresh session and retries once.
3. **Emit UI events** — Deductive `answer` chunks → existing `messageChunk` → `messageComplete`;
   round finalized via `roundStarted` **before** `roundComplete`. (The persistence pipeline
   keys conversation writes off `roundStarted`; omitting it breaks persistence.)
4. **Return a normal `ConversationRound`** (`model_usage.connector_id: "deductive"`).

## Gating (two layers)

| Layer | What | Where |
|---|---|---|
| Feature flag (per-deployment, outermost) | `agentBuilder.deductiveEnabled` (LaunchDarkly). Off by default; self-managed / LD-unreachable stays off | read in `runner.ts` |
| Advanced Setting (runtime, per-deployment) | `agentBuilder:deductiveEnabled` — also gates the agent's **visibility** (availability handler) | `ui_settings.ts` + `plugin.ts` |

Flag off ⇒ the `deductive.ai` agent is hidden from the agents list and execution is dead (404,
no external calls), even if settings/env are configured.

## Configuration

| Setting | Meaning | Notes |
|---|---|---|
| `agentBuilder:deductiveEnabled` | master switch (Advanced Setting) | also gates agent visibility |
| `agentBuilder:deductiveEndpoint` | Deductive cluster base URL | e.g. `https://app.deductive.ai` |
| `agentBuilder:deductiveApiKey` | `dak_...` API key | **cluster-local**: mint on the same cluster as the endpoint |

Read precedence (in `runner.ts`): explicit **user-provided** value → **global** (deployment-wide)
value → **env** (`DEDUCTIVE_ENDPOINT` / `DEDUCTIVE_API_KEY` / `DEDUCTIVE_REFRESH_TOKEN`) as a dev
fallback. When the settings config is active, env refresh-token/team-id are deliberately **not**
leaked (they would replay against the wrong cluster).

Also required: the pre-existing `agentBuilder:experimentalFeatures` Advanced Setting must be on
for the user (the chat routes are gated on it), and Agent Builder needs at least one chat LLM
configured (the platform's normal "No Large Language Model" gate) — Deductive does not replace
that requirement.

## Files

| File | Purpose |
|---|---|
| `run_agent/deductive/config.ts` | constants (flag id, agent id `deductive.ai`, settings/defaults) + `resolveDeductiveConfig` |
| `run_agent/deductive/deductive_client.ts` | crude SSE client (session create, message send, stream read, token refresh) |
| `run_agent/deductive/run_deductive_agent.ts` | orchestrates: session continuity → call → events → round |
| `run_agent/deductive/errors.ts` + `session_unavailable_error.ts` | typed errors |
| `run_agent/run_agent.ts` | the single routing branch |
| `server/ui_settings.ts` + `setting_ids/index.ts` | registers the 3 settings (user + global scope) |
| `server/plugin.ts` | registers the built-in `deductive.ai` agent + availability gate |
| `runner/runner.ts` + `runner/run_agent.ts` + `runner/types.ts` | flag + settings → `context.deductive` |
| `agents/provider.ts` (agent-builder-server) | type-only `deductive?: DeductiveRuntimeConfig` on the run context |
| `allow_lists.ts` (agent-builder-server) | allow-lists the built-in agent id |
| `deductive/config.ts` | `DEDUCTIVE_AVATAR_ICON` — the Deductive logo as an inline base64 data URI (no asset-serving/UI changes; matches repo precedent of inlining SVGs) |

## Secrets note

The API key lives in a **plaintext Advanced Setting** (Advanced Settings are not a secret
vault). Acceptable for internal dogfooding only. Productized path (when/if needed) = a
`.deductive` Stack Connector with encrypted secrets. No real keys are committed anywhere.

## Tests

`run_agent/deductive/*.test.ts` — routing, session create/reuse, SSE answer/complete → round,
error propagation, session recovery, config precedence (21 unit tests + routing test). Typecheck
and eslint clean; full agent_builder server suite green.

## Removal

When Deductive moves into Kibana, deleting this integration is:

1. Delete `run_agent/deductive/` (7 files).
2. Remove the `shouldUseDeductive` branch in `run_agent.ts`.
3. Remove the built-in agent registration + availability block in `plugin.ts`.
4. Remove the 3 Advanced Settings (`setting_ids/index.ts` + `ui_settings.ts`).
5. Remove the `deductive` plumbing in `runner.ts` / `runner/run_agent.ts` / `runner/types.ts`.
6. Remove the allow-list entry + `DeductiveRuntimeConfig` from `agents/provider.ts`.
7. Delete this doc.

No other agent paths are touched, so the default chat experience is unaffected in the interim.