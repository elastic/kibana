## Test layout

The Scout UI suite is split into four namespaces, one per app surface. Each
namespace owns its own Playwright config(s) and manifest, but they all share
one set of fixtures:

```text
test/scout/
├── common/ui/fixtures/                # shared `test` fixture, constants, helpers, page objects — NOT a namespace (no playwright.config.ts)
├── connectors/ui/tests/               # 9 specs / 76 tests
├── rules/ui/tests/                    # 10 specs / 36 tests
├── alerts/ui/tests/                   # 7 specs / 26 tests
└── maintenance_windows/ui/tests/      # 3 specs / 13 tests
```

Every namespace's `ui/fixtures/index.ts` is a one-line re-export of
`common/ui/fixtures`:

```ts
export * from '../../../common/ui/fixtures';
```

so specs keep importing from `'../fixtures'` unchanged no matter which
namespace they live in. `common/ui/tsconfig.json` is its own TypeScript
project (referenced by each namespace's `ui/tsconfig.json` via a `kbn_references`
path entry) so the merged fixture is type-checked once and none of the
namespaces has to reach across into another's project boundary.

All 151 tests currently run under sequential `tests/` (`workers: 1`, the
Scout default) — there is no `parallel_tests/` yet. When a namespace moves to
a parallel lane, it gets its own `parallel_tests/` and
`parallel.playwright.config.ts`, following the standard Scout convention:
`tests/` for specs that need exclusive ownership of the stack,
`parallel_tests/` for everything else.

### Why these four namespaces

They are not invented categories — they are the plugin's four app surfaces,
already encoded as four path constants in the fixtures (`CONNECTORS_APP_PATH`,
`RULE_DETAILS_APP_PATH`, `MAINTENANCE_WINDOWS_APP_PATH`, `STACK_ALERTS_PAGE_PATH`):

| Namespace | Covers |
|---|---|
| `connectors` | Connector list, flyout, and per-type forms (Slack, Jira, JSM, Opsgenie, Tines, webhook, email, ES-query, index-threshold-from-spec) |
| `rules` | Rule creation/edit flows, rules list/tabs/navigation, rules settings, bulk actions, cross-space rule logs |
| `alerts` | Stack alerts page (RBAC, roles, admin), per-alert snooze, alert deletion, rule details alerts tab |
| `maintenance_windows` | Maintenance windows table, create, and update flows |

`alerts` is also the only namespace carrying a serverless-search-tagged spec
(`stack_alerts_page_rbac.spec.ts`), so it is the only one scheduled on
serverless-search targets.

### Where to add new tests

Find the app surface your spec exercises and add it to that namespace's
`tests/`. If it doesn't cleanly fit one of the four, it likely belongs in
`rules` (rule-adjacent) or `alerts` (alert-adjacent) — ask `@elastic/response-ops`
if still unclear.

### The alerts-index caveat

Stack alert documents are **not** space-partitioned at the index level —
every stack alert, in every space, lands in the same
`.internal.alerts-stack.alerts-default-000001` index behind
`.alerts-stack.alerts-default`. Any spec under `alerts/` that seeds or reads
alert documents must filter by rule UUID (see `gotoAlertForRule` in
`common/ui/fixtures/page_objects/stack_alerts_page.ts`) rather than asserting
on an unfiltered row or index-wide count — this becomes load-bearing once
`alerts` moves to a parallel lane with multiple workers sharing that index.

## How to run tests

First start the servers:

```bash
node scripts/scout.js start-server --arch stateful --domain classic
```

Then run a namespace's tests in another terminal:

```bash
node scripts/scout.js run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/triggers_actions_ui/test/scout/connectors/ui/playwright.config.ts

node scripts/scout.js run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/triggers_actions_ui/test/scout/rules/ui/playwright.config.ts

node scripts/scout.js run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/triggers_actions_ui/test/scout/alerts/ui/playwright.config.ts

node scripts/scout.js run-tests --arch stateful --domain classic \
  --config x-pack/platform/plugins/shared/triggers_actions_ui/test/scout/maintenance_windows/ui/playwright.config.ts
```

Or run by file — Scout derives the right config from the spec's namespace:

```bash
node scripts/scout.js run-tests --arch stateful --domain classic \
  --testFiles x-pack/platform/plugins/shared/triggers_actions_ui/test/scout/connectors/ui/tests/connector_jsm.spec.ts
```
