# Agent Builder Scout tests (`scout_agent_builder`)

Scout tests for the agent_builder plugin, grouped into **namespaces** so CI can
schedule them as independent Playwright configs. They share the `agent_builder`
server config set.

`test/scout_agent_builder_smoke/` is a **different** Scout root on purpose: a
small smoke suite with its own server config. Do not add specs there unless they
belong in that smoke lane.

## Namespaces

| Namespace | API | UI | Notes |
|---|---|---|---|
| `converse` | `converse_*`, `chat_api_converse`, `attachments` | Conversation flow, error handling, sidebar flow | LLM-proxy converse path; several specs run `local` and `task_manager`. Split this further if the config is still a congested lane. |
| `conversations` | `conversations_*` | Conversation history | Conversation HTTP CRUD, pagination, access control, concurrency |
| `agents` | `agents_*`, `update_agent`, `space_default_agent` | Agents list, create/edit, landing, sidebar switch, space default | Agent HTTP + management UI |
| `tools` | `tools_*`, `mcp_connector` | Create/manage tool, MCP tools/clients | `mcp_clients` is `@local-serverless-search` only |
| `platform` | `sml_*`, `skills_*`, `rbac`, `spaces`, `availability_gating`, `plugins_installation` | — | API-only. Gating, SML, skills, plugin install |

`common/` is shared Playwright fixtures. It is **not** a namespace (no `playwright.config.ts`).

### Where a new spec goes

- Converse / chat streaming / attachments → `converse`
- Conversation list/get/create/delete/pagination/access-control → `conversations`
- Agent CRUD, access-control, space default agent → `agents`
- Tools, ES\|QL, index search, MCP connector → `tools`
- SML, skills, RBAC, spaces, availability, plugin installation → `platform`

Every spec must live under some namespace's `testDir` (`<namespace>/{api,ui}/tests/`).
There is no catch-all config, so a spec outside those directories is silently
never run. After adding or moving a spec, run `update-test-config-manifests` and
confirm the `.meta/` manifest lists it.

If `converse` exceeds the Scout lane target (~15 minutes of test time), split the
dual-mode specs (`converse_tool_calling`, `converse_attachments`,
`converse_error_regenerate`, `converse_simple_multi`) into a `converse_modes`
namespace — the same pattern as `scout_alerting_v2`'s `engine_executor`.

## Layout

```text
test/scout_agent_builder/
├── common/api/fixtures/          # apiTest, constants, converse_http, space_paths
├── common/ui/fixtures/           # test, page objects
├── converse/{api,ui}/
├── conversations/{api,ui}/
├── agents/{api,ui}/
├── tools/{api,ui}/
└── platform/api/                 # API-only
```

Each namespace category has `playwright.config.ts` (`testDir: './tests'`) and a
one-line fixture re-export from `common/`. Specs import `../fixtures`.

These suites are sequential (`workers: 1`). Do not add a parallel API lane until
cleanup is isolated — specs mutate conversations, agents, connectors, and indices
cluster-wide.

## Run

```bash
# discovery (`scout_agent_builder` is a custom server config set)
node scripts/scout.js discover-playwright-configs --target local --include-custom-servers

# long-running stack
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet agent_builder

# one namespace
node scripts/scout.js run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder/converse/api/playwright.config.ts

# by file (Scout picks playwright.config.ts from the path)
node scripts/scout.js run-tests --arch stateful --domain classic \
  --testFiles x-pack/platform/plugins/shared/agent_builder/test/scout_agent_builder/agents/api/tests/agents_api.spec.ts
```

Manifests live at `test/scout_agent_builder/<namespace>/.meta/{api,ui}/`.
Regenerate with:

```bash
node scripts/scout.js update-test-config-manifests
```
