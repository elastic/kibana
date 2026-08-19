# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/platform/test/functional/apps/lens/group3` |
| Target module root | `x-pack/platform/plugins/shared/lens/test/scout` |
| Generated | 2026-08-18 |
| Deployment targets | stateful only (`@local-stateful-classic`) |
| FTR config chain | `group3/config.ts` → `x-pack/platform/test/functional/config.base.ts` |
| Issue | [#276971](https://github.com/elastic/kibana/issues/276971) |
| Land after | [#285654](https://github.com/elastic/kibana/pull/285654) (group 4) — rebase before shared `lens.save()` edits |

See the Cursor plan for the full inventory. Execution is batched.

## Batches

1. **Save matrix** — `core/ui/parallel_tests/add_to_dashboard/save_matrix.spec.ts` (this PR step)
2. **Heatmap + RBAC** — `add_to_dashboard/heatmap.spec.ts`, `add_to_dashboard/rbac.spec.ts`
3. **Runtime fields** — `core/ui/parallel_tests/runtime_fields.spec.ts`

## Batch 1 notes

- Reuse `createLogstashLensEditorSuiteSetup({ loadLensArchives: true, skipEmptyLensOpen: true })`.
- Do not edit shared `lens_app.ts` while #285654 is open. Local `LensEditorApp.saveToDashboard` covers `saveAsNew` + `saveToLibrary`.
- Do not call `cleanStandardList()` in new `afterAll` hooks.
- Exact metric values downgraded to title + `/^[\d,.]+$/`.
