# Design — External Deductive agent execution for Agent Builder

Status: **implemented locally (2026-09-09) · E2E verified · NOT PUSHED · V2: flag + settings + builtin agent**
Owner: normzhou · Internal feature.

## Verified end-to-end (local dev stack)

- `POST /api/chat/converse` with `agent_id: deductive.ai` → completed round answered by
  Deductive (`DX_INTEGRATED_OK`), `model_usage.connector_id: 'deductive'`.
- `conversation.metadata.deductive_session_id` persisted on turn 1; turn 2 on the same
  conversation **reused the same Deductive session** (thread memory confirmed).
- Unit tests: 19 in `run_agent/deductive/**` + routing test in `run_agent.test.ts`; typecheck
  and eslint clean.
- Wiring detail: Deductive path **must emit `roundStarted` before `roundComplete`** — the
  persistence pipeline (`execution_runner.ts buildPersistenceEvents`) keys conversation writes
  off the roundStarted event (matches round_complete by round_id).

## Goal

Route selected Agent Builder agents to **Deductive AI** for execution while preserving the
existing chat UX: same routes, same streaming UI, same conversation persistence, same multi-turn
behavior. Everything runs through the existing `runAgent` seam.

## Current state & gaps this design addresses

| Requirement | Current | Desired |
|---|---|---|
| Configured via UI (endpoint, api key, agent ids) | env vars only | **Advanced Settings** (Stack Management) — implemented |
| Gate for Elastic-internal deployments | `agentBuilder:experimentalFeatures` (user-level) | **LaunchDarkly flag, per-deployment** (`agentBuilder.deductiveEnabled`) — implemented |
| Code available to all users on a Deployment | only for a user-created agent | **built-in `deductive.ai`** (allow-list + plugin registration) — implemented |
| Secrets | plaintext env | Plaintext **Advanced Setting** (documented for internal only; productized path = `.deductive` stack connector, deferred) |

No new UI, no new modals — Advanced Settings (generically rendered) + built-in agent.

## Implemented wiring

- **Feature flag**: `agent_builder/server/services/execution/run_agent/deductive/config.ts` → `DEDUCTIVE_ENABLED_FLAG = 'agentBuilder.deductiveEnabled'` read per-request in `runner.ts`
  via `runnerDeps.featureFlags.getBooleanValue(..., false)`; `featureFlags` threaded through `RunnerFactoryDeps` + `CreateScopedRunnerDeps` + `create_services.ts`. Self-managed/LD-unreachable stays off (significant_events precedent).
- **Advanced Settings**: 4 new ids in `setting_ids/index.ts`
  (`agentBuilder:deductiveEnabled|Endpoint|ApiKey|AgentIds`), registered in `server/ui_settings.ts`
  (experimental). Read per-request in `runner.ts` `Promise.all` → `context.deductive`.
- **Run context**: `AgentHandlerContext.deductive: DeductiveRuntimeConfig` added in
  `agent-builder-server/agents/provider.ts` (+ re-exported), populated in
  `run_agent.ts createAgentHandlerContext` from `manager.deps.deductive`.
- **Resolver**: `resolveDeductiveConfig(contextDeductive)` in `config.ts` —
  Advanced Settings take precedence; env vars (`DEDUCTIVE_API_KEY` etc.) stay a dev fallback;
  `shouldUseDeductive(agentId, contextDeductive)` uses the resolved list.
- **Built-in agent**: `deductive.ai` added to `AGENT_BUILDER_BUILTIN_AGENTS`
  (allow_lists.ts) and registered in `plugin.ts` setup with `enable_elastic_capabilities: false`,
  `tools: []`, `connector_ids: []` — available to **every user** of the deployment.
- `run_deductive_agent` now consumes `context.deductive` (endpoint/key/team) with env fallback.

## 1. Feature flag (LaunchDarkly, per-deployment)

Precedent: `significant_events` — `x-pack/platform/plugins/shared/significant_events/common/feature_flags.ts`
documents exactly this model: *"Scope is per-deployment, not per-space: it is read through
`featureFlags.getBooleanValue` … driven from the elastic/kibana-feature-flags repository"* and
self-managed deployments stay off (`getBooleanValue(flag, false)`).

- Add to `agent_builder`: flag id `agentBuilder.deductiveEnabled`, read at execution start via
  `core.featureFlags.getBooleanValue('agentBuilder.deductiveEnabled', false)` (FeatureFlagsStart
  is already wired into `agent_builder/server/services/types.ts` and passed through
  `create_services.ts`).
- The flag is the **outermost gate**: when off, Deductive routing never activates regardless of
  the Advanced Settings.

## 2. Advanced Settings (global config for all users)

New setting ids in `src/platform/packages/shared/kbn-management/settings/setting_ids/index.ts`
(alongside the other `AGENT_BUILDER_*_SETTING_ID`s):

```
agentBuilder:deductiveEnabled    (boolean, default false, experimental)
agentBuilder:deductiveEndpoint   (string, default https://turing.deductive.ai, experimental)
agentBuilder:deductiveApiKey     (string, default '', experimental)   // plaintext — internal only
agentBuilder:deductiveAgentIds   (string, default 'deductive.ai', experimental)
```

Registered in `server/ui_settings.ts` (same file that registers `experimentalFeatures` / bash),
so they render for free in **Stack Management → Advanced Settings** and are settable via the
existing runtime API (`POST /api/kibana/global_settings` / `/internal/kibana/settings`). No new UI.

Read at execution time: `runner.ts` already reads several `AGENT_BUILDER_*_SETTING_ID`s per
request via `uiSettings.asScopedToClient(...).get(id)` — extend the existing Promise.all to read
the four new settings and carry them (a single `deductive` object) on the run context so
`run_deductive_agent` and `shouldUseDeductive` consume settings instead of env.

## 3. Built-in `deductive.ai` (all users)

Register a **built-in agent** (id `deductive.ai`, type `chat`, default config
`{ enable_elastic_capabilities: false, tools: [], connector_ids: [] }`) via the agents setup
contract (`agents.register`), the same surface `nightshift_investigations` uses for its
investigation agent. Requires adding `deductive.ai` to
`AGENT_BUILDER_BUILTIN_AGENTS` in
`x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts`.

A built-in agent:
- is **available to every user of the deployment** (no per-user creation) — code ships it;
- is **readonly**; users can't edit it (fine — routing is purely internal);
- resolves config via the same `toInternalDefinition` path (type `chat` → legacy defaults for
  `enable_elastic_capabilities`, which we explicitly set false).

Users select it in the agent selector ↔ `parameters.agentId === 'deductive.ai'` →
`shouldUseDeductive` (settings-based) routes to the Deductive path.

## 4. Code changes

| Area | Change |
|---|---|
| `setting_ids/index.ts` | 4 new `agentBuilder:deductive*` ids (shared) |
| `agent_builder/server/ui_settings.ts` | register the 4 settings |
| `agent_builder/server/services/execution/runner/runner.ts` | read settings → put `deductive` config on run context |
| `agent-builder-server/agents/provider.ts` | add `deductive` field to `AgentHandlerContext` (type-only) |
| `run_agent/deductive/config.ts` | read from `context` instead of env (env stays dev fallback) |
| `run_agent/deductive/run_deductive_agent.ts` | use `context.deductive` for token/endpoint/team |
| `agent_builder/server/plugin.ts` | gate registrations behind the LD flag + register built-in agent when per-deployment enabled |

Env vars keep working as a dev fallback when the LD flag is enabled but settings are unset
(so local dev without Advanced Settings still functions).

## 5. Tests / acceptance

- Extend `runner.ts`-level unit tests: settings propagate onto the context.
- `config.ts` unit tests: settings override env; env fallback when settings unset.
- `run_deductive_agent` tests keep passing with `context.deductive` populated by the mock.
- E2E: with LD flag "on" (locally: `coreApp.allowDynamicConfigOverrides` +
  `feature_flags.overrides.agentBuilder.deductiveEnabled: true`, or a test override), set
  Advanced Settings for endpoint+key+agent id, then converse as *any user* — Deductive round
  completes and the built-in agent is selectable for everyone.

## 6. Open items / notes

- Settings are **plaintext** (Advanced Settings are not a secret vault). Acceptable for the
  internal one-off; productized path = a `.deductive` Stack Connector (encrypted secrets,
  per-agent `connector_ids`) — deferred, not blocked.
- `agentBuilder.deductiveEnabled` flag must be registered in `elastic/kibana-feature-flags`
  (per the significant-events workflow) to ship to ECH/Serverless.
- `googleaistudio`-type endpoints aren't relevant here (Deductive is the backend, not an
  inference endpoint).

## Appendix: where "setup"/"parameters" live in this codebase

- **Setup = plugin Advanced Settings** (`uiSettings.register` in `server/ui_settings.ts`),
  rendered generically in Stack Management; runtime-settable via `/api/kibana/global_settings`.
- **Params = `conversePayloadSchema`** (`server/routes/chat.ts`) — we deliberately did NOT put
  the key in the request path (per-call leakage); the settings route is the chosen one-off.
- **Feature gating = LaunchDarkly `featureFlags`** (already plumbed; match significant_events).
## Cluster configuration steps (ops guide)

Enabling the Deductive agent on a deployment is **3 settings + 1 flag**. No code, no restart
(for the flag: one restart if using `kibana.yml` overrides).

### 0. Prerequisite — Agent Builder needs an LLM present

Agent Builder (the platform) requires at least one chat-capable LLM (connector or
`chat_completion` inference endpoint) before ANY execution path works — this is the
"No Large Language Model detected" gate. Configure your normal LLM first (Model Management /
Connectors); Deductive rides on top and does not replace it.

### 1. Deductive cluster (Deductive side, not Kibana)

1. Log into the **target** cluster's web app (e.g. `https://app.deductive.ai` lighthouse or
   `https://turing.deductive.ai`).
2. **Settings → API Keys** → create a `dak_` key. **API keys are cluster-local** — a key minted
   on one cluster is invalid on another.
3. Note the cluster base URL — that is the `deductiveEndpoint` value. Confirm via
   Settings → CLI (dx) Setup, which pre-fills the correct `--endpoint`.

### 2. Feature flag — per-deployment gate (all users)

`agentBuilder.deductiveEnabled` (LaunchDarkly). Off for self-managed / LD-unreachable by
default (fallback `false`), matching the `significant_events` pattern.

- **ECH / Serverless**: register the flag in `elastic/kibana-feature-flags` (controlled
  rollout); Support can set an override.
- **Self-managed / quick**: `config/kibana.yml`
  ```yaml
  feature_flags.overrides:
    agentBuilder.deductiveEnabled: true
  ```
  (add `coreApp.allowDynamicConfigOverrides: true` if you also want runtime overrides via the
  internal settings API.)

### 3. Advanced Settings — per-deployment config (all users)

Stack Management → **Advanced Settings** (rendered automatically once the code ships; also
settable via `POST /internal/kibana/global_settings` with the `x-elastic-internal-origin:
Kibana` header, requires `manage_advanced_settings`).

| Setting | Value |
|---|---|
| `agentBuilder:deductiveEnabled` | `true` |
| `agentBuilder:deductiveEndpoint` | cluster base URL, e.g. `https://turing.deductive.ai` |
| `agentBuilder:deductiveApiKey` | `dak_...` (minted on that same cluster) |
| `agentBuilder:deductiveAgentIds` | `deductive.ai` (default; comma-separated for extras) |

Also ensure `agentBuilder:experimentalFeatures` is enabled for the users (the chat
routes/UI are gated on it — it is the pre-existing experimental switch).

### 4. Verify

1. Agents list shows `deductive.ai` (built-in, readonly, logo avatar) for all users.
2. `POST /api/chat/converse` with `{"agent_id":"deductive.ai","input":"..."}`
   → 200, round `completed`, `model_usage.connector_id: "deductive"`.
3. Multi-turn: second message on the same `conversation_id` reuses the same Deductive session
   (`conversation.metadata.deductive_session_id` unchanged).

### Troubleshooting

- **401 from Deductive** → key/endpoint mismatch: `dak_` must be minted on the cluster the
  endpoint points at.
- **404 on `/api/chat/converse`** → `agentBuilder:experimentalFeatures` off for the user.
- **"No connector available for chat execution"** → no LLM configured (step 0); note the
  Deductive path is unaffected by WHICH connector, the platform just requires one.
- **Feature not active** → LD flag off/unreachable; enable per step 2.
- **Key in plaintext** → Advanced Settings are not a secret vault; internal use only.
  Productized path (future) = `.deductive` Stack Connector with encrypted secrets.
