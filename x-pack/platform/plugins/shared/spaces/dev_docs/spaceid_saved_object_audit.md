# SpaceId Saved Object field audit

> Audit-only deliverable. **No type or runtime changes are made by this document.**
> It enumerates the persisted Saved Object (SO) fields that hold a space identifier
> so that follow-up PRs can brand them (`SpaceId`) in a scoped, prioritized way.

## Why this exists

`SpaceId` is a branded string type (`@kbn/core-spaces-common`). Public read contracts
(e.g. `getSpaceId()`, the rule executor `spaceId`) are already branded. Persisted SO
fields that store a space id are still declared as plain `string` / `schema.string()`.

Branding every SO field at once is disproportionate and conflicts with two decisions
already made for this effort:

1. **Don't validate persisted data on read.** Use a non-throwing re-brand
   (`brandSpaceId`) at trusted load boundaries, never `asSpaceId` (which throws) on
   data coming back from ES.
2. **Internal string variables are a non-goal.** Only fields that cross a contract or
   feed a downstream cast are worth branding.

This audit makes the scope concrete so the branding can be done per-type, at the load
boundary, in later PRs.

## Method

```
# schema-validated SO / task params
grep -rnE "spaceId:\s*schema\.(string|maybe)" --include='*.ts' x-pack src
# io-ts codecs
grep -rnE "spaceId:\s*(t|rt)\.(string|partial)" --include='*.ts' x-pack src
# TS attribute interfaces
grep -rnE "spaceId(\?)?:\s*string" --include='*.ts' <so dirs>
```

Test fixtures (`x-pack/platform/test/**`, `*.test.ts`) are excluded.

## Classification

### A. Persisted SO fields — in scope for branding

| # | Field location | SO / attributes | Branded on load today? | Notes |
|---|---|---|---|---|
| 1 | `task_manager/server/saved_objects/schemas/task.ts` (×4) + `task.ts:309` (`ConcreteTaskInstance.spaceId?`) | `task` SO params/attrs | ❌ No — read as `Record<string, any>` | Root of the chain. The alerting view is addressed separately by the task-params branding PR (US-3.1.3). |
| 2 | `alerting/server/saved_objects/schemas/raw_ad_hoc_run_params/v1.ts:51` | ad-hoc run SO | ✅ `ad_hoc_task_runner.ts:191` `brandSpaceId(adHocRunData.spaceId)` | Boundary already branded; schema stays `schema.string()`. |
| 3 | `alerting/server/application/backfill/result/schemas/index.ts:51` | backfill result SO | ❌ No | Candidate for `brandSpaceId` at the read boundary in the backfill client. |
| 4 | `actions/server/saved_objects/schemas/raw_oauth_state/v1.ts:16` | connector OAuth state SO | ✅ `task_runner_factory.ts:223` `brandSpaceId(spaceId)` | Boundary already branded. |
| 5 | `alerting_v2/server/lib/rule_executor/task_definition.ts:24` | alerting v2 task def params | ❌ No | New surface; brand at the v2 executor boundary when it matures. |
| 6 | `fleet/server/services/agent_policies/bump_agent_policies_by_id_task.ts:33` and `deploy_agent_policies_task.ts:33` | fleet task params (task SO) | ❌ No | Fleet-owned; brand at the task run boundary. |
| 7 | `alerting/server/rule_type_registry.ts:332` | rule execution task params schema | ❌ No | Same shape as #1; part of the alerting task-params story. |

### B. io-ts codecs that produce a space id

| Codec | Produces | Notes |
|---|---|---|
| `kbn-alerting-state-types/src/rule_task_instance.ts:20` (`ruleParamsSchema.spaceId: t.string`) | `RuleTaskParams.spaceId: string` | Target of US-3.1.3 (brand on deserialization). |
| `observability/plugins/infra/.../id_formats/v1/id_formats.ts:25` | `spaceId: rt.string` | Solution-owned SO; out of platform scope. |
| `observability/plugins/synthetics/.../monitor_types.ts:348` | `spaceId: t.string` | Solution-owned; out of platform scope. |
| `kbn-slo-schema/.../routes/health_scan.ts:63` | route payload | Route contract, not SO — see group C. |

### C. Route / request params — NOT SO-persisted (belongs to the contract sweep, US-3.1.5)

- `security/server/routes/authorization/roles/get_all_by_space.ts:35`
- `spaces/server/routes/api/internal/get_content_summary.ts:48`
- `security_solution/server/endpoint/routes/actions/orphan_actions_space_handler.ts:147`

These validate an inbound request param, not a stored SO. They are candidates for the
public-contract sweep, not for SO branding.

### D. Excluded (test fixtures)

`x-pack/platform/test/alerting_api_integration/**` (aad, alerts routes, actions
simulators). No product impact.

## Already-branded load boundaries (reference)

These are the trusted `brandSpaceId` boundaries that a schema-level brand would layer on
top of — branding the schema type must not duplicate or fight these:

- `alerting/server/task_runner/task_runner.ts:360`
- `alerting/server/task_runner/ad_hoc_task_runner.ts:191`
- `alerting/server/task_runner/rule_loader.ts:240`
- `alerting/server/task_runner/resolve_cps_data.ts:34`
- `actions/server/lib/task_runner_factory.ts:223`

## Recommendation (feeds later PRs)

Brand **typed models only**, at the load boundary, prioritized by whether the field
feeds a cast or a public contract:

1. **Highest value** — the `task` SO / `RuleTaskParams` chain (#1, #7, group B row 1).
   Handled by the task-params branding PR (US-3.1.3).
2. **Next** — backfill result (#3) and alerting v2 task def (#5): add `brandSpaceId`
   at their respective read boundaries; keep `schema.string()` unchanged.
3. **Leave as-is** — #2 and #4 (already branded on load), fleet #6 (solution-owned;
   coordinate with Fleet), and all of group C/D.

Runtime schemas stay `schema.string()` / `t.string` everywhere: branding is a
**compile-time** guarantee applied once on load, never a validation-on-read.
