# Osquery Scout tests

Playwright UI and API tests under `test/scout_osquery/` run against Kibana using Scout's path-based custom config detection (`config_sets/osquery/`). The same `config_sets/osquery/` directory is consumed by **both** the PR-pipeline (Tier-A) and the nightly real-agent pipeline (Tier-B); the Docker bridging settings it declares (host.docker.internal Fleet Server, ES on 0.0.0.0) are no-ops when no Docker stack is running.

## Authentication (stateful classic)

`classic.stateful.config.ts` orders **`basic`** authentication before **SAML** so a developer hitting
`http://localhost:5620` (or the Scout default URL) does not get stuck in a SAML redirect loop. SAML remains available as
the second provider. UI specs use `loginWithCustomRole` / `loginAsOsqueryPowerUser()` rather than hand-typing
credentials in each test.

## Two-tier test structure

The UI suite is split into two tiers with very different runtime requirements:

### Tier A — PR pipeline (mocked Fleet agents)

- Config: `ui/parallel.playwright.config.ts`
- Specs: `ui/parallel_tests/*.spec.ts`
- Registered via Scout auto-discovery (`SCOUT_UNIFIED_CONFIG_PATH_REGEX`).
- **No Docker**, no Fleet Server, no Elastic Agent containers.
- The osquery agent picker is populated in the browser via `mockFleetAgents(page, opts)` — see [Mocking the Fleet agent picker](#mocking-the-fleet-agent-picker) below.
- Osquery-side data (action responses, result rows, scheduled pack results) is still seeded directly into the indices the osquery UI reads from, via the existing data-loader helpers.
- Wall-clock target: **< 8 minutes** per shard on stateful classic and serverless security_complete.

### Tier B — nightly real-agent pipeline

- Config: `ui/real_agent.playwright.config.ts`
- Specs: `ui/real_agent_tests/*.spec.ts`
- **Not** auto-discovered — explicitly excluded in `.buildkite/scout_ci_config.yml`.
- Requires Docker for Fleet Server + Elastic Agent orchestration.
- Owned by `security-defend-workflows` (not appex-qa).
- Triggered by: nightly cron, path changes to `osquery/server/{lib,handlers,routes}/**`, or PR comment `/ci-osquery-agents`.

### Mocking the Fleet agent picker

`mockFleetAgents(page, opts)` installs Playwright `page.route` handlers that intercept the **Fleet-wrapper** endpoints used by the osquery agent picker (`/internal/osquery/fleet_wrapper/agents`, `/internal/osquery/fleet_wrapper/agent_policies`) and fulfills them with synthesized data. Osquery-side routes (`/api/osquery/live_queries`, results polling, saved queries, packs, etc.) **always hit real Kibana** so the osquery surface under test stays honest.

```ts
import { mockFleetAgents, indexActionResponses, indexResultRows } from '../helpers/data_loaders';

const { agents } = await mockFleetAgents(page, { count: 2 });

// Picker now shows two synthesized agents. Submit a live query through the real
// /api/osquery/live_queries endpoint, then seed the matching action responses
// and result rows so the UI shows results without a real agent running.
await indexActionResponses(esClient, { actionId, agents, rowCountPerAgent: 1 });
await indexResultRows(esClient, { actionId, agents, rows: [{ name: 'Linux' }] });
```

Supported options: `count`, `policyId`, `policyName`, `platforms`, `status`. Use `count: 0` to render the picker's empty state. A reference response payload lives at `ui/helpers/data_loaders/__fixtures__/agents_response.example.json`.

#### Mock contract verification

`ui/real_agent_tests/mock_fleet_agents.contract.spec.ts` runs in the nightly tier only. It fetches the live response from `GET /internal/osquery/fleet_wrapper/agents` against a real Fleet Server + enrolled agent, then diffs the top-level / `agents[0]` / `groups` field shape against the output of `mockFleetAgents`. The contract test fails fast if Fleet changes its payload, surfacing drift before the mock silently masks bugs in the PR pipeline.

### Tier assignment

```
TIER A (parallel_tests/) — mocked Fleet, full UI surface:
  alert_case_creation, alert_flyout_take_action, alert_parameter_substitution,
  alert_response_action_form, custom_space, fleet_integration,
  live_query_ecs_mapping, live_query_history,
  live_query_pack_submission, live_query_saved_query_dropdown,
  live_query_submission_no_agent, live_query_submission_with_agent,
  osquery_case_observability, osquery_case_security,
  packs_crud, packs_policy_sync, saved_queries_crud

TIER B (real_agent_tests/) — real Fleet Server + enrolled agent:
  enrollment_and_picker, inventory_osquery_tab_real_agent,
  live_query_real_agent, saved_query_real_agent,
  pack_real_agent, alert_response_action, mock_fleet_agents.contract
```

## Data-loader helpers

Located at `ui/helpers/data_loaders/`. Mirror the `security_solution/common/endpoint/data_loaders/` pattern:

| Helper                      | What it does                                                       | Tier |
| --------------------------- | ------------------------------------------------------------------ | ---- |
| `mockFleetAgents`           | Intercepts Fleet-wrapper picker requests via `page.route`          | A    |
| `indexActionResponses`      | Bulk-indexes per-agent action response docs                        | A, B |
| `indexResultRows`           | Bulk-indexes osquery query result rows                             | A, B |
| `indexScheduledPackResults` | Bulk-indexes scheduled pack execution rows                         | A, B |
| `OsqueryDataGenerator`      | Typed agent / hostname / IP synthesis used by other helpers above  | A, B |

Direct writes to the `.fleet-agents` system index are intentionally NOT supported — serverless rejects the index as restricted, and on stateful the index does not exist until Fleet Server's first heartbeat. Use `mockFleetAgents` (Tier-A) or rely on real Fleet enrollment (Tier-B) instead.

## Phase 6 Cypress deletion gate

Cypress sources will be deleted when all of the following are met:
1. **Tier A**: 7-day soak with no flake on the default PR pipeline.
2. **Tier B**: 3 consecutive nightly greens.
3. **Tier B**: 25× Flaky Test Runner green for agent-dependent specs.

See `openspec/changes/osquery-scout-ui-phase5-completion/` for the deletion tracking change.
