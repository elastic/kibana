# alerting_v2 Scout tests (`scout_alerting_v2`)

Scout tests for the alerting_v2 plugin, grouped into **namespaces** so CI can schedule them as independent Playwright configs. They share the `alerting_v2` server config set (`xpack.alerting_v2.enabled=true` and relaxed schedule guardrails).

`test/scout/` is a **different** Scout root on purpose: it uses the default server config so `alerting:v2:enabled` stays unpinned for the Agent Builder skill-gating suite.

## Namespaces

| Namespace | API | UI | Notes |
|---|---|---|---|
| `rules` | Rule HTTP CRUD, rule-template read APIs, error-envelope contract, matcher-value suggestions | Rules list, builder, Discover flyout | Mostly local-only (`@local-stateful-classic`); the rule-template specs are `tags.deploymentAgnostic` |
| `action_policies` | Action-policy HTTP CRUD | Policy create/edit and privileges | Local-only |
| `alerts` | Alert actions, execution history, rule-event field suggestions | Alert episodes, Discover compose, execution-history smoke | Local-only |
| `engine` | End-to-end, telemetry, implicit index privileges, SML types access, **rule history** | — | `tags.stateful.classic` (local **and** cloud). API-only. |
| `engine_director` | Director | — | Split out of `engine` to cut CI wall-time. `tags.stateful.classic`. API-only. |
| `engine_dispatcher` | Dispatcher | — | Split out of `engine` to cut CI wall-time. `tags.stateful.classic`. API-only. |
| `engine_executor` | Rule executor | — | Split out of `engine` to cut CI wall-time (heaviest suite). `tags.stateful.classic`. API-only. |
| `management` | — | `management_required_privileges` | `tags.deploymentAgnostic`. UI-only. |

`common/` is shared utilities and Playwright fixtures. It is **not** a namespace (no `playwright.config.ts`).

### Where a new spec goes

- HTTP route for rules / rule templates / action policies / alert actions / execution history → that family's namespace, `api/tests/`.
- Rule executor specs → `engine_executor`. Director specs → `engine_director`. Dispatcher specs → `engine_dispatcher`. End-to-end, telemetry, rule-history, and other engine specs that poll `.rule-events` / `.alert-actions` with `POLL_TIMEOUT_MS` → `engine`. (The `engine*` namespaces were split apart to keep each CI config's wall-time down; keep new engine specs in the smallest matching one.)
- UI for a management page → the matching namespace's `ui/tests/`.
- Cross-page privilege interstitial → `management`.

Every spec must live under some namespace's `testDir` (`<namespace>/{api,ui}/tests/`). There
is no catch-all config, so a spec outside those directories is silently never run. After
adding or moving a spec, run `update-test-config-manifests` and confirm the `.meta/`
manifest lists it.

### Why `rule_history` lives in `engine`

Rule-change history is a rules concern, but the spec is tagged `tags.stateful.classic`. Config-level scheduling unions every tag in the config, so putting those 8 tests in `rules` would schedule the entire rules CRUD suite on cloud-stateful-classic. Keep it in the `engine*` namespaces (currently `engine`) until that tag is dropped.

## Layout

```text
test/scout_alerting_v2/
├── common/{builders,constants,roles,urls}.ts
├── common/services/
├── common/api/fixtures/          # apiTest + alertingV2 apiServices
├── common/ui/fixtures/           # test + page objects
├── rules/{api,ui}/
├── action_policies/{api,ui}/
├── alerts/{api,ui}/
├── engine/api/
├── engine_director/api/
├── engine_dispatcher/api/
├── engine_executor/api/
└── management/ui/
```

Each namespace category has `playwright.config.ts` (`testDir: './tests'`) and a one-line fixture re-export from `common/`. Specs import `../fixtures`.

These suites are sequential (`workers: 1`). Do not add a parallel API lane until cleanup is isolated — almost every spec calls cluster-wide `*.cleanUp()`.

## Run

```bash
# discovery (`scout_alerting_v2` is a custom server config set)
node scripts/scout.js discover-playwright-configs --target local --include-custom-servers

# long-running stack (custom config set is inferred from scout_alerting_v2)
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet alerting_v2

# one namespace
node scripts/scout.js run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/alerting_v2/test/scout_alerting_v2/engine/api/playwright.config.ts

# by file (Scout picks playwright.config.ts from the path)
node scripts/scout.js run-tests --arch stateful --domain classic \
  --testFiles x-pack/platform/plugins/shared/alerting_v2/test/scout_alerting_v2/rules/api/tests/create_rule.spec.ts
```

Manifests live at `test/scout_alerting_v2/<namespace>/.meta/{api,ui}/`. Regenerate with:

```bash
node scripts/scout.js update-test-config-manifests
```
