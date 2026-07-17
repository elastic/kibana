# SpaceId contract sweep — criteria + prioritized inventory

> Deliverable for US-3.1.5, following the agreed approach **B then A**:
> **(B)** data-driven inventory prioritized by rebrand call sites, then
> **(A)** an explicit “public contract” definition so we sweep only what matters.
>
> This document is the actionable artifact. It intentionally makes **no code
> changes**: the analysis below shows that the high-value sweeps are gated on
> upstream branding work (see [Dependencies](#dependencies)), so each sweep
> should land as its own scoped PR once its dependency is in.

## (A) What counts as a “public contract”

FR-2 (“`grep spaceId: string` → zero”) is aspirational; the PRD marks internal
string variables as a non-goal. We brand a `spaceId` field only if it is a
**public contract**, defined as any of:

1. A plugin **setup/start contract** method/param (exported via `types.ts`).
2. An exported **package entry-point** type/function (`common/`, `@kbn/*` public API).
3. A **cross-plugin** value passed between plugins (not a private helper).

Explicitly **out of scope**: function-local variables, private class fields, and
values that never cross a module boundary.

### Trust boundaries are not “rebrands to remove”

A `brandSpaceId` / `asSpaceId` call is only removable if its input is *already*
a `SpaceId`. Calls that convert **raw or persisted** input are legitimate and
must stay:

- `asSpaceId(...)` parsing a regex match / URL segment (validate untrusted input).
- `brandSpaceId(...)` loading a `string` off a Saved Object or task params
  (re-brand trusted persisted data without throwing).
- `brandSpaceId(...)` building a fake/scoped request from a task's `spaceId`.

Branding these away would push validation onto the read path — which the effort
explicitly decided against.

## (B) Rebrand call sites (25 prod sites), classified

| File | Kind | Removable? |
|---|---|---|
| `core/packages/spaces/common/src/spaces_url_parser.ts` (×2) | URL parse / build boundary | ❌ legitimate |
| `triggers_actions_ui/.../event_log/event_log_list_cell_renderer.tsx` (×2) | brands `spaceIds: string[]` prop + `activeSpace.id` | ⚠️ after `Space.id: SpaceId` |
| `task_manager/server/task_running/fake_request_factory.ts` | fake request from task `spaceId` | ❌ legitimate |
| `alerting/server/task_runner/task_runner.ts` | task-params load boundary | ✅ handled by US-3.1.3 |
| `alerting/server/task_runner/rule_loader.ts` | SO load boundary | ❌ legitimate |
| `alerting/server/task_runner/resolve_cps_data.ts` | CPS load boundary | ❌ legitimate |
| `alerting/server/task_runner/ad_hoc_task_runner.ts` | ad-hoc SO load boundary | ✅ tightened by US-3.1.3 |
| `actions/server/lib/task_runner_factory.ts` | SO/task load boundary | ❌ legitimate |
| `reporting/server/lib/tasks/run_report.ts` | task load boundary | ❌ legitimate |
| `kbn-reporting/server/export_type.ts` | task load boundary | ❌ legitimate |
| `apm/.../get_internal_saved_objects_client.ts` | scoped SO client from `string` | ❌ legitimate |
| `osquery/.../get_internal_saved_object_client.ts` | scoped SO client from `string` | ❌ legitimate |
| `security_solution/.../endpoint/.../saved_objects_client_factory.ts` | scoped SO client | ❌ legitimate |
| `security_solution/.../deprecations/signals_migration.ts` | migration boundary | ❌ legitimate |
| `security_solution/.../risk_score/tasks/helpers.ts` | task boundary | ❌ legitimate |
| `security_solution/.../privilege_monitoring/tasks/privilege_monitoring_task.ts` | task boundary | ❌ legitimate |
| `security_solution/.../rule_preview/api/preview_rules/route.ts` | route boundary | ❌ legitimate |
| `security_solution/.../agent_builder/tools/run_rule_preview_tool.ts` | tool boundary | ❌ legitimate |
| `discoveries/server/plugin.ts` | plugin boundary | ❌ legitimate |
| `security/server/anonymous_access/anonymous_access_service.ts` | request boundary | ❌ legitimate |
| `rule_registry/.../rule_executor.test_helpers.ts` | test helper | – |
| `core/packages/http/browser-internal/src/http_service.ts` | URL/space boundary | ❌ legitimate |
| `core/packages/http/router-server-mocks/src/router.mock.ts` | mock | – |

**Takeaway:** ~2 of 25 sites are removable, and both are gated on `Space.id: SpaceId`.
The rest are correct trust boundaries. A literal FR-2 sweep would fight the
non-goal and the no-validate-on-read decision.

## (B) Public `spaceId: string` contracts, prioritized

Ranked by blast radius / value. Each is its own follow-up PR.

### P1 — platform plugin contracts (high traffic)

| Contract | Location |
|---|---|
| `IEventLogService.getClientWithRequestInSpace(request, spaceId: string)` | `event_log/server/types.ts:61` |
| `ActionExecutorOptions.spaceId: string` | `actions/server/types.ts:333` |
| `alerting_v2` executor `spaceId: string` (×2) | `alerting_v2/server/types.ts:45,51` |
| `actions/common/alert_history_schema.ts:53` `spaceId: string` | actions common |

### P2 — core packages

| Contract | Location |
|---|---|
| SO security extension `spaceId: string` | `core/packages/saved-objects/server/.../security.ts:605` |
| user-profile service `spaceId: string` | `core/packages/user-profile/server/src/service.ts:67` |
| core usage stats `spaceId: string` | `core/packages/usage-data/server-internal/.../core_usage_stats_client.ts:388` |
| injected-metadata `spaceId: string` | `core/packages/injected-metadata/common-internal/src/types.ts:59` |

### P3 — solution / newer contracts

`agent_builder_platform`, `agent_builder_sml`, `agent_builder/common/traces.ts`.
Newer surfaces; brand as they stabilize.

### Deliberately left as `string`

- `SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined`
  (`actions` + `alerting` `types.ts`): callers already pass branded values; the
  param accepts the wider `string` on purpose (namespace conversion is a sink,
  not a source). Branding adds churn without a guarantee.
- `addSpaceIdToPath(spaceId: string = '')`: the empty-string default means
  “no space”, which a `SpaceId` cannot represent. Keep `string`.

## Dependencies

The removable rebrands and the P1/P2 sweeps are **not independent**:

1. **`Space.id: SpaceId`** (separate in-flight branch). On `main`, `Space.id` is
   still `string`, so branding consumer contracts (e.g. the event-log renderer)
   would just move the `brandSpaceId` upstream, not remove it. Sweep after this lands.
2. **US-3.1.3 task params** (branded `RuleTaskInstance.params.spaceId`). Already
   removes the redundant re-brand in `alerting` `task_runner.ts`.

## Recommended sequencing

1. Land `Space.id: SpaceId` → unblocks the event-log renderer + UI rebrands.
2. Land US-3.1.3 → alerting task-params branded (done in a sibling PR).
3. Sweep **P1** contracts, one plugin per PR, deleting the now-redundant rebrand
   at each call site.
4. Sweep **P2** core contracts with Core review.
5. Do **not** chase literal FR-2; keep trust boundaries as `brandSpaceId`/`asSpaceId`.
