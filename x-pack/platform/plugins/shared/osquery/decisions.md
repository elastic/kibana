# Shared integration pack targeting decisions

## Task 2.3 — security and API contract audit (2026-11-17)

Run: `20261117-osquery-integration-centric-pack-targeting-for-3`.
Compared tasks 1.1–2.2 (`f713a27f7322` through `084b35e161b6`) with
their pre-run base, `7a4fda9f6df8`.

- All new Fleet reads use the client returned by
  `createInternalSavedObjectsClientForSpaceId(osqueryContext, request)`.
  The wrapper, read and find routes pass that client to
  `fetchAllPackagePolicies`; the wrapper and effective-target helper also pass
  it to `agentPolicyService.getByIds` with `ignoreMissing: true`.
  Create/update reuse their existing scoped package-policy scan for warnings.
  No new call supplies `spaceIds`, including `spaceIds: ['*']`.
  The existing optional `spaceIds` parameter on the drain helper is unchanged.
- The complete `security` blocks in the wrapper and create/update/read/find
  routes are identical to the base. Existing `osquery-read`,
  `osquery-readPacks` and `osquery-writePacks` requirements remain in place.
- Ran the plugin's `node scripts/openapi/bundle` using pinned Node 24.22.3.
  Both ESS and Serverless bundles regenerated without a working-tree diff.
  Compared each bundle against `git show 7a4fda9f6df8:<bundle-path>` using
  `oasdiff diff` and `oasdiff breaking`, both with
  `--match-path '^/api/osquery' --format json`.
  Both breaking reports were `[]`. The only changed operations are
  POST/GET `/api/osquery/packs` and PUT/GET `/api/osquery/packs/{id}`:
  optional top-level response `warnings` on writes and optional response
  `data.effective_policy_ids` on reads (on each data item for find).
  Updated read examples show the effective ids.
- An additional structural assertion parsed both YAML bundles and removed only
  those four optional response properties and their example values. Each
  resulting document deep-equaled its base. This verifies unchanged request
  bodies, parameters, required lists, existing response properties and other
  paths, including through shared component references.
- ESLint passed for all 14 server files changed by tasks 1.1–2.2, including
  their tests, using `node scripts/eslint` with the paths from
  `git diff --name-only 7a4fda9f6df8 HEAD -- x-pack/platform/plugins/shared/osquery/server`.
- The first scoped type-check attempt stopped before compilation because the
  local project map did not resolve `@kbn/workflows-topics` from
  `workflowsExecutionEngine`. Per the setup instructions, ran
  `node scripts/kbn bootstrap`; it refreshed the ignored package map and
  tsconfig paths, but dependency downloads failed with npm registry DNS errors.
  Stopped that stalled install. The second type-check attempt reached the
  Osquery TypeScript build using the refreshed map.
- **Task check failed.** The second and final command,
  `node scripts/type_check --project x-pack/platform/plugins/shared/osquery/tsconfig.json`,
  exited 1 (compiler exited 2), reporting six errors in five files:
  - `server/routes/fleet_wrapper/get_agent_policies.test.ts:70`: TS2352,
    saved-object contract mock cast to concrete `SavedObjectsClient`.
  - `server/routes/pack/read_pack_route.ts:110` and
    `server/routes/pack/find_pack_route.ts:112`: TS2322,
    possibly undefined agent-policy service passed to the required helper input.
  - `server/routes/pack/update_pack_route.test.ts:188,191`: TS2352,
    incomplete mocks cast to full agent/package-policy services.
  - `server/routes/pack/utils.test.ts:2348`: TS2352,
    incomplete fixture cast to `PackagePolicy`.
  Stopped after two failed attempts as required by the run. These errors remain
  unfixed; task 2.3 is not green. No Fleet changes are needed based on this audit.

Assumptions: the explicit task-2.3 type check takes precedence over the general
instruction deferring full verification. No Jest tests were added or changed;
contract/security assertions and ESLint passed against the existing implementation
before this record was added, but the baseline type check failed. Type fixes
remain for a subsequent authorized attempt because of the hard stop. This file lives inside the plugin
to satisfy the run's Osquery-only scope; the external OpenSpec files and task
checkboxes are unchanged. Future shared-integration E2E seeding requires a
trial/Enterprise local server; API/UI E2E belongs to later tasks.
