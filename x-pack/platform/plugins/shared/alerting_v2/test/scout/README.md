# alerting_v2 Scout tests

Scout tests for the alerting_v2 plugin, grouped into **namespaces** so CI can schedule them as independent Playwright configs. They run against the default Scout servers; there is no custom server config set, so the same suites can run on serverless.

Each config has a global setup hook that turns on the `alerting:v2:enabled` advanced setting (every alerting_v2 route returns 503 without it) and a global teardown hook that unsets it. The exception is `agent_builder_skills`, which needs the setting unset to cover the disabled cases.

## Namespaces

| Namespace | API | UI | Notes |
|---|---|---|---|
| `rules` | Rule HTTP CRUD, rule-template read APIs, error-envelope contract, matcher-value suggestions | Rules list, builder, Discover flyout | API: `API_ENGINE_TAG`, except the custom-role-auth suites (`find_rules`, `match_rules`, `matcher_value_suggestions`), which stay `@local-stateful-classic` until ECH supports custom roles. |
| `action_policies` | Action-policy HTTP CRUD | Policy create/edit and privileges | API: `API_ENGINE_TAG` |
| `alerts` | Alert actions, execution history, rule-event field suggestions | Alert episodes, Discover compose, execution-history smoke | API: `API_ENGINE_TAG`, except the custom-role-auth suites (`create_ack_episode_action`, `create_tag_episode_action`, `rule_event_fields_suggestions`, `user_profiles_suggestions`), which stay `@local-stateful-classic` until ECH supports custom roles. |
| `engine` | End-to-end, telemetry, implicit index privileges, SML types access, rule history | — | `API_ENGINE_TAG`. API-only. |
| `engine_director` | Director | — | Split out of `engine` to cut CI wall-time. `API_ENGINE_TAG`. API-only. |
| `engine_dispatcher` | Dispatcher | — | Split out of `engine` to cut CI wall-time. `API_ENGINE_TAG`. API-only. |
| `engine_executor` | Rule executor | — | Split out of `engine` to cut CI wall-time (heaviest suite). `API_ENGINE_TAG`. API-only. |
| `management` | — | `management_required_privileges` | `tags.deploymentAgnostic`. UI-only. |
| `agent_builder_skills` | Agent Builder alerting v2 skill gating | — | No global setup, so `alerting:v2:enabled` starts unset. API-only. |

`API_ENGINE_TAG` (`common/constants.ts`) is the shared tag for API and engine suites, currently `tags.deploymentAgnostic`.

`common/` is shared utilities and Playwright fixtures. It is **not** a namespace (no `playwright.config.ts`).

### Where a new spec goes

- HTTP route for rules / rule templates / action policies / alert actions / execution history → that family's namespace, `api/tests/`.
- Rule executor specs → `engine_executor`. Director specs → `engine_director`. Dispatcher specs → `engine_dispatcher`. End-to-end, telemetry, rule-history, and other engine specs that poll `.rule-events` / `.alert-actions` with `POLL_TIMEOUT_MS` → `engine`. (The `engine*` namespaces were split apart to keep each CI config's wall-time down; keep new engine specs in the smallest matching one.)
- UI for a management page → the matching namespace's `ui/tests/`.
- Cross-page privilege interstitial → `management`.

Scout rejects a root-level `test/scout/{api,ui}/` next to namespaces, so every spec must live under some namespace's `testDir` (`<namespace>/{api,ui}/tests/`). There
is no catch-all config, so a spec outside those directories is silently never run. After
adding or moving a spec, run `update-test-config-manifests` and confirm the `.meta/`
manifest lists it.

## Rule executions

Rules are created with `SCHEDULE_INTERVAL` (`1m`), the default `xpack.alerting_v2.rules.minimumScheduleInterval`; anything shorter is rejected with `400 SCHEDULE_INTERVAL_TOO_SHORT`. A rule runs once on creation and then only every minute, so specs that depend on rule executions request them through the `_run` API:

- `ruleEvents.waitForAtLeast` and `ruleExecutions.waitForRuns` call `rules.run` on every poll whose condition is not met yet.
- Inline `expect.poll` blocks that wait for rule-produced state call `apiServices.alertingV2.rules.run(rule.id)` at the start of each iteration.
- `rules.run` resolves with the HTTP status; 409 (a run is already in flight) is expected while polling.

Specs that seed `.rule-events` directly (`ruleEvents.seed`), such as the dispatcher and execution-history suites, do not need `_run`.

## Layout

```text
test/scout/
├── agent_builder_skills/api/     # no global setup
├── common/{alerting_v2_setting,builders,constants,roles,urls}.ts
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

Each namespace category has `playwright.config.ts` (`testDir: './tests'`, `runGlobalSetup: true`), `tests/global.{setup,teardown}.ts`, and a one-line fixture re-export from `common/`. Specs import `../fixtures`.

These suites are sequential (`workers: 1`). Do not add a parallel API lane until cleanup is isolated — almost every spec calls cluster-wide `*.cleanUp()`.

## Run

```bash
# long-running stack
node scripts/scout.js start-server --arch stateful --domain classic

# one namespace
node scripts/scout.js run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/alerting_v2/test/scout/engine/api/playwright.config.ts

# by file (Scout picks playwright.config.ts from the path)
node scripts/scout.js run-tests --arch stateful --domain classic \
  --testFiles x-pack/platform/plugins/shared/alerting_v2/test/scout/rules/api/tests/create_rule.spec.ts
```

Manifests live at `test/scout/<namespace>/.meta/{api,ui}/`. Regenerate with:

```bash
node scripts/scout.js update-test-config-manifests
```
