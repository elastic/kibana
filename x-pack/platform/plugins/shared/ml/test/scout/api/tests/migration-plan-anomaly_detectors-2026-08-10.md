# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/platform/test/api_integration/apis/ml/anomaly_detectors` |
| Target module root | `x-pack/platform/plugins/shared/ml/test/scout/api/tests` |
| Generated | `2026-08-10` |
| Deployment targets | stateful (today); serverless candidate — see section 8 |
| FTR config chain | `x-pack/platform/test/api_integration/apis/ml/config.ts` → `x-pack/platform/test/api_integration/config.ts` → `x-pack/platform/test/functional/config.base.ts` |

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `create_with_spaces.ts` | test | Creates an AD job in a specific space, asserts it is space-associated to that space only | 1 | simple | API test | Pure API CRUD + space assertion; no browser |
| 2 | `delete_with_spaces.ts` | test | Deletes an AD job from same-space (200) and cross-space (404), waits for job to appear/disappear | 2 | simple | API test | Pure API CRUD with space isolation; no browser |
| 3 | `create.ts` | test | Creates an AD job as ML_POWERUSER (200) and ML_VIEWER (403); validates response shape | 2 | simple | API test | Tests HTTP API behaviour and auth; no browser needed |
| 4 | `create_with_datafeed.ts` | test | Creates an AD job with an inline datafeed_config; asserts datafeed fields in response | 1 | simple | API test | Tests API request/response shape; no browser |
| 5 | `get.ts` | test | GET all jobs, by id, by ids list; GET all stats, single stats, multiple stats — viewer succeeds, unauthorized gets 403 | 8 | simple | API test | Pure read API coverage across auth levels; no browser |
| 6 | `open_with_spaces.ts` | test | Opens an AD job from same-space (200) and cross-space (404); asserts job state after each call | 2 | medium | API test | Requires job state management helpers not yet in Scout |
| 7 | `close_with_spaces.ts` | test | Closes an opened AD job from same-space (200) and cross-space (404); asserts job state | 2 | medium | API test | Requires job state management helpers not yet in Scout |
| 8 | `get_with_spaces.ts` | test | GET jobs by exact id, wildcard, group, group wildcard — from correct space and different space | 10 | medium | API test | Space-scoped reads at multiple granularities; no browser |
| 9 | `get_stats_with_spaces.ts` | test | Same pattern as get_with_spaces but for `/_stats` endpoint | 10 | medium | API test | Space-scoped stats reads; near-identical to get_with_spaces |
| 10 | `get_buckets.ts` | test | Runs a datafeed to completion then tests `results/buckets` structure, single-timestamp fetch, 404 for bad job, 404 for bad timestamp | 4 | complex | API test | Requires farequote data and a running datafeed; no browser |
| 11 | `get_overall_buckets.ts` | test | Runs two datafeeds then tests `results/overall_buckets` structure, bucket_span parameter, overall_score filter, 404 for bad job | 4 | complex | API test | Requires farequote data and two running datafeeds |
| 12 | `forecast_with_spaces.ts` | test | Tests forecast and delete-forecast against a running job with various auth/space combinations | 9 | complex | API test | Shared mutable state across `it()` blocks; sequential journey; requires datafeed run |
| 13 | `index.ts` | index | Barrel file loading all 12 test files | — | — | delete | Each `loadTestFile` target becomes its own Scout spec |

### Proposed file splits (omit if none)

`get.ts` has 4 nested `describe` blocks (GetAnomalyDetectors, GetAnomalyDetectorsById, GetAnomalyDetectorsStats, GetAnomalyDetectorsStatsById). Because they share `beforeAll`/`afterAll` setup (both jobs + farequote archive), they should remain one Scout spec file with `test()` blocks for each sub-case. The spec has 8 assertions total and is not oversized.

### Tests to drop (omit if empty)

None — all 12 test files cover distinct API surface worth preserving.

### Tests to defer (omit if empty)

None — the missing helpers can be added to the Scout ML service as part of this migration (see section 6).

---

## 2. Test type routing

### API tests

All 12 test files map to Scout API tests in `tests/anomaly_detectors/`.

| FTR file | Proposed spec path | Why API not UI |
|----------|--------------------|----------------|
| `create.ts` | `tests/anomaly_detectors/create.spec.ts` | Tests HTTP API request/response; no browser interaction |
| `create_with_datafeed.ts` | `tests/anomaly_detectors/create_with_datafeed.spec.ts` | Tests API persists datafeed config; no browser |
| `create_with_spaces.ts` | `tests/anomaly_detectors/create_with_spaces.spec.ts` | Tests space-scoped API create; no browser |
| `get.ts` | `tests/anomaly_detectors/get.spec.ts` | Read-only API coverage; no browser |
| `get_with_spaces.ts` | `tests/anomaly_detectors/get_with_spaces.spec.ts` | Space-scoped API reads; no browser |
| `get_stats_with_spaces.ts` | `tests/anomaly_detectors/get_stats_with_spaces.spec.ts` | Space-scoped API stats; no browser |
| `open_with_spaces.ts` | `tests/anomaly_detectors/open_with_spaces.spec.ts` | API lifecycle; no browser |
| `close_with_spaces.ts` | `tests/anomaly_detectors/close_with_spaces.spec.ts` | API lifecycle; no browser |
| `delete_with_spaces.ts` | `tests/anomaly_detectors/delete_with_spaces.spec.ts` | API CRUD; no browser |
| `get_buckets.ts` | `tests/anomaly_detectors/get_buckets.spec.ts` | Data-correctness assertions on API response; no browser |
| `get_overall_buckets.ts` | `tests/anomaly_detectors/get_overall_buckets.spec.ts` | Data-correctness assertions on API response; no browser |
| `forecast_with_spaces.ts` | `tests/anomaly_detectors/forecast_with_spaces.spec.ts` | API CRUD for forecasts; no browser |

---

## 3. Parallelism plan

All 12 specs should go into `tests/` (sequential), NOT `parallel_tests/`.

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| All 12 specs | All create/open/delete AD jobs at the cluster level (not space-scoped saved objects) and write to shared `.ml-*` system indices. Concurrent specs would interfere with `cleanAnomalyDetection` teardown and job state assertions. |

> Note: The space-scoped specs use job IDs like `fq_single_space1` which are not unique across concurrent runs. If parallel execution is ever desired, job IDs must be randomised per run.

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Used by (files) | Verdict |
|-------------|----------|-----------------|---------|
| `x-pack/platform/test/fixtures/es_archives/ml/farequote` | `farequote-*` indices with responsetime time-series data | `create.ts`, `create_with_datafeed.ts`, `forecast_with_spaces.ts`, `get_buckets.ts`, `get_overall_buckets.ts` | Keep for Batch 3; **not needed** for `create.ts` or `create_with_datafeed.ts` (those tests don't read the archive data) |

The FTR `esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote')` in `create.ts` and `create_with_datafeed.ts` is a precaution — neither test runs a datafeed or reads from the index. These calls can be dropped for those two Scout specs.

For `get_buckets.ts`, `get_overall_buckets.ts`, and `forecast_with_spaces.ts`, the datafeed reads from `ft_farequote` (the Scout-conventional index name, per `getADFqDatafeedConfig`). **NEEDS VERIFICATION**: whether `ft_farequote` is pre-seeded in the Scout stateful cluster or must be loaded via `esArchiver` in `beforeAll`. If it must be loaded, use the Scout `esArchiver` fixture in the spec's `beforeAll`.

### UI settings mutations

None — no `kibanaServer.uiSettings` calls in any of the 12 test files. `ml.testResources.setKibanaTimeZoneToUTC()` in FTR is an ambient setting; verify whether Scout's default cluster is already UTC (it typically is, so this call can be dropped).

### Shared constants to extract (omit if empty)

| Value | Occurrences | Current locations |
|-------|-------------|-------------------|
| `'fq_single_space1'` | 6 files | `create_with_spaces.ts`, `delete_with_spaces.ts`, `get_with_spaces.ts`, `get_stats_with_spaces.ts`, `open_with_spaces.ts`, `close_with_spaces.ts` | 

> Only extract if the specs share a common constants file. Because they all live in `tests/anomaly_detectors/`, a local `constants.ts` in that subdirectory is appropriate. Keep inline for single-file use.

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Scout role target | Notes |
|-----------|--------|---------------------|-----------------|-------------------|-------|
| `ML_POWERUSER` | FTR `security_common.ts` | `manage_ml` + `ml: all` in all spaces | `create.ts`, `create_with_datafeed.ts` | `samlAuth.asMlPoweruser()` | Already in `ML_USERS.mlPoweruser` in Scout ML fixtures |
| `ML_POWERUSER_ALL_SPACES` | FTR `security_common.ts` | Same as `ML_POWERUSER` but explicit `spaces: ['*']` | `create_with_spaces.ts`, `open_with_spaces.ts`, `close_with_spaces.ts`, `delete_with_spaces.ts`, `forecast_with_spaces.ts` | `samlAuth.asMlPoweruser()` | `ML_USERS.mlPoweruser` already uses `spaces: ['*']`; no new role needed |
| `ML_VIEWER` | FTR `security_common.ts` | `ml: read` in all spaces | `create.ts`, `get.ts`, `get_buckets.ts`, `get_overall_buckets.ts`, `forecast_with_spaces.ts` | `samlAuth.asMlViewer()` | Already in `ML_USERS.mlViewer` in Scout ML fixtures |
| `ML_VIEWER_ALL_SPACES` | FTR `security_common.ts` | Same as `ML_VIEWER` but explicit `spaces: ['*']` | `get_with_spaces.ts`, `get_stats_with_spaces.ts` | `samlAuth.asMlViewer()` | `ML_USERS.mlViewer` already uses `spaces: ['*']`; no new role needed |
| `ML_UNAUTHORIZED` | FTR `security_common.ts` | Kibana `discover: read` only, no ML | `get.ts` | `samlAuth.asMlUnauthorized()` | Already in `ML_USERS.mlUnauthorized` in Scout ML fixtures |

### Over-privileged tests

None — the FTR tests already use the least-privileged role that can exercise each endpoint. The ML_POWERUSER role is correct for write operations; ML_VIEWER is correct for read operations; ML_UNAUTHORIZED is correct for 403 assertions.

### Roles deserving shared helpers (used in ≥3 files)

- `ML_POWERUSER` / `samlAuth.asMlPoweruser()`: 7 files — the existing `mlApiTest.extend` in `test/scout/api/fixtures/index.ts` already provides this.
- `ML_VIEWER` / `samlAuth.asMlViewer()`: 5 files — same, already provided.

### Special auth patterns (omit if none)

None — all FTR tests use password-based `supertestWithoutAuth.auth(user, password)`. In Scout, this maps to `samlAuth.asInteractiveUser(roleDescriptor)` + `cookieHeader` merged with `INTERNAL_API_HEADERS`.

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by (files) | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-----------------|-------------------------|-------------------|-------------------|
| `ml.api.createAnomalyDetectionJob(config, spaceId?)` | Creates an AD job via the Kibana internal API, optionally in a named space | 7 files | **Partial** — `apiServices.ml.anomalyDetection.createViaKibana(config)` exists but has no `spaceId` parameter | no | Add `spaceId` param to `@kbn/scout` `MlADJobsApi.createViaKibana` |
| `ml.api.cleanMlIndices()` | Deletes all AD jobs, calendars, filters, annotations, expired data, syncs saved objects | 5 files | yes — `apiServices.ml.indices.cleanAnomalyDetection()` | no | use existing |
| `ml.testResources.cleanMLSavedObjects(spaceIds?)` | Syncs ML saved objects, optionally per space | 5 files | **Missing** | no | Add to `@kbn/scout` `MlSavedObjectsApi` or handle via `savedObjects.sync(false, spaceId)` for each space |
| `ml.api.closeAnomalyDetectionJob(jobId)` | Closes an AD job via the Kibana internal API | `open_with_spaces.ts`, `close_with_spaces.ts` (afterEach), `forecast_with_spaces.ts` | **Missing** | no | Add to `@kbn/scout` `MlADJobsApi` |
| `ml.api.openAnomalyDetectionJob(jobId)` | Opens an AD job via the Kibana internal API | `close_with_spaces.ts`, `forecast_with_spaces.ts`, `get_buckets.ts`, `get_overall_buckets.ts` | **Missing** | no | Add to `@kbn/scout` `MlADJobsApi` |
| `ml.api.waitForJobState(jobId, state)` | Polls until AD job reaches the given `JOB_STATE` | `open_with_spaces.ts`, `close_with_spaces.ts`, `forecast_with_spaces.ts` | **Missing** | no | Add to `@kbn/scout` `MlADJobsApi` |
| `ml.api.waitForAnomalyDetectionJobToExist(jobId)` | Polls until job exists | `delete_with_spaces.ts` | yes — `apiServices.ml.anomalyDetection.waitForJobToExist(jobId)` | no | use existing |
| `ml.api.waitForAnomalyDetectionJobNotToExist(jobId)` | Polls until job is deleted | `delete_with_spaces.ts` | yes — `apiServices.ml.anomalyDetection.waitForJobNotToExist(jobId)` | no | use existing |
| `ml.api.assertJobSpaces(jobId, type, spaces)` | Asserts a job is associated with exactly the listed Kibana spaces | `create_with_spaces.ts` | **Missing** | yes (throws on mismatch) | Add as plain helper in `tests/anomaly_detectors/` — too narrow for `@kbn/scout` |
| `ml.api.createDatafeed(config, spaceId?)` | Creates an ML datafeed via the Kibana internal API, optionally in a named space | `forecast_with_spaces.ts`, `get_buckets.ts`, `get_overall_buckets.ts` | **Missing** | no | Add to `@kbn/scout` `MlApiService` as `datafeeds.create(config, spaceId?)` |
| `ml.api.startDatafeed(datafeedId, params)` | Starts a datafeed via the ES API | `forecast_with_spaces.ts`, `get_buckets.ts`, `get_overall_buckets.ts` | **Missing** | no | Add to `@kbn/scout` as `datafeeds.start(datafeedId, params)` |
| `ml.api.waitForDatafeedState(datafeedId, state)` | Polls until datafeed reaches given `DATAFEED_STATE` | `forecast_with_spaces.ts`, `get_buckets.ts`, `get_overall_buckets.ts` | **Missing** | no | Add to `@kbn/scout` as `datafeeds.waitForState(datafeedId, state)` |
| `ml.api.assertForecastResultsExist(jobId)` | Asserts that forecast results are present in the `.ml-anomalies-*` index | `forecast_with_spaces.ts` | **Missing** | yes (throws on mismatch) | Add as plain helper in `tests/anomaly_detectors/forecast_with_spaces.spec.ts` — too narrow for `@kbn/scout` |
| `ml.commonConfig.getADFqSingleMetricJobConfig(jobId)` | Returns an AD job config for the farequote dataset | 7 files | yes — `getADFqSingleMetricJobConfig` in `test/scout/api/services/ml_common_configs.ts` | no | use existing (import from services) |
| `ml.commonConfig.getADFqDatafeedConfig(jobId)` | Returns a datafeed config for the farequote dataset | `forecast_with_spaces.ts`, `get_buckets.ts`, `get_overall_buckets.ts` | yes — `getADFqDatafeedConfig` in `test/scout/api/services/ml_common_configs.ts` | no | use existing (import from services) |
| `spacesService.create/delete` | Creates and deletes Kibana spaces | 7 files | yes — `apiServices.spaces.create()/delete()` | no | use existing |
| `retry.tryForTime(ms, fn)` | Retries an async function for a set duration | `forecast_with_spaces.ts` (`deleteForecast`) | N/A in Scout — use `waitForCondition` pattern instead | no | Replace with polling helper or direct call |

### EUI components interacted with directly

None — all tests are API tests with no browser interaction.

### Brittle locator strategies

None — API tests, no DOM selectors.

### Page objects with hidden assertions

`ml.api.assertJobSpaces` and `ml.api.assertForecastResultsExist` contain assertions. When porting, move assertions into the spec body, keeping the helper as a data-fetching function.

---

## 7. Server configuration

### FTR server args (full chain)

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| `--xpack.security.session.idleTimeout=3600000` | `x-pack/platform/test/api_integration/config.ts` | already in Scout default | no action needed |
| `--telemetry.optIn=true` | `x-pack/platform/test/api_integration/config.ts` | already in Scout default | no action needed |
| `--xpack.fleet.agents.pollingRequestTimeout=5000` | `x-pack/platform/test/api_integration/config.ts` | runtime-settable | not needed by ML AD tests |
| `--xpack.ruleRegistry.write.enabled=true` | `x-pack/platform/test/api_integration/config.ts` | already in Scout default | no action needed |
| `--monitoring_collection.opentelemetry.metrics.prometheus.enabled=true` | `x-pack/platform/test/api_integration/config.ts` | not needed | not used by AD tests |
| `--xpack.fleet.experimentalFeatures.integrationKnowledge=false` | `x-pack/platform/test/api_integration/apis/ml/config.ts` | runtime-settable / not needed | not used by AD tests |
| `--xpack.fleet.experimentalFeatures.installIntegrationsKnowledge=false` | same | same | not needed by AD tests |

### ES server args

| Arg | Source config | Notes |
|-----|-------------|-------|
| `node.attr.name=apiIntegrationTestNode` | base config | not needed by Scout |
| `path.repo=/tmp/repo,/tmp/repo_1,/tmp/repo_2,/tmp/cloud-snapshots/` | base config | snapshot repository; not used by AD tests |

### Custom server config needed?

No. None of the AD test-specific server args require a custom Scout server config set. The default Scout stateful servers config is sufficient.

---

## 8. Deployment targets

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------| 
| `create.spec.ts` | stateful + serverless (NEEDS VERIFICATION) | ML AD API available in Security/Observability serverless; no stateful-only assumptions |
| `create_with_datafeed.spec.ts` | stateful + serverless (NEEDS VERIFICATION) | Same as above |
| `create_with_spaces.spec.ts` | stateful + serverless (NEEDS VERIFICATION) | Spaces API works in serverless; space association logic is plugin-level |
| `get.spec.ts` | stateful + serverless (NEEDS VERIFICATION) | Pure read API; likely portable |
| `get_with_spaces.spec.ts` | stateful + serverless (NEEDS VERIFICATION) | Spaces API works in serverless |
| `get_stats_with_spaces.spec.ts` | stateful + serverless (NEEDS VERIFICATION) | Same as get_with_spaces |
| `open_with_spaces.spec.ts` | stateful + serverless (NEEDS VERIFICATION) | Job lifecycle API; ML available in serverless |
| `close_with_spaces.spec.ts` | stateful + serverless (NEEDS VERIFICATION) | Same as open |
| `delete_with_spaces.spec.ts` | stateful + serverless (NEEDS VERIFICATION) | Same |
| `get_buckets.spec.ts` | stateful only (NEEDS VERIFICATION) | Requires farequote data loading; unclear if available in serverless test environment |
| `get_overall_buckets.spec.ts` | stateful only (NEEDS VERIFICATION) | Same |
| `forecast_with_spaces.spec.ts` | stateful only (NEEDS VERIFICATION) | Same; also more complex setup |

**Tag pattern to use**: match existing ML Scout API tests:
```ts
tag: ['@local-stateful-classic', ...tags.serverless.observability.complete, ...tags.serverless.security.complete]
```
For specs with NEEDS VERIFICATION on serverless, start with `@local-stateful-classic` only and expand after verification.

### Stateful/serverless mirror FTR files

None found after searching by basename, test titles, and `loadTestFile` references across `x-pack/platform/test/serverless/`, `x-pack/solutions/*/test/serverless/`, and all serverless-named directories. The FTR anomaly_detectors tests are stateful-only today.

### Coverage gaps (omit if none)

All 12 specs currently run only in stateful. Whether they should also run in serverless (observability/security) is marked as NEEDS VERIFICATION above.

### Cloud portability issues (omit if none)

No hardcoded localhost URLs, local file paths, or single-node topology assumptions in any of the 12 test files. The tests are portable to Cloud once the deployment target question (serverless) is resolved.

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|------------|---------|
| Shared mutable state | `forecast_with_spaces.ts` | 66 (`let forecastId`), ~107 (assigned), ~114 (read) | `forecastId` is set in one `it()` block and consumed by two later `it()` blocks | These three `it()` blocks form a single sequential journey: run forecast → delete forecast (unauthorized) → delete forecast (authorized). Must be combined into one `test()` with `test.step()` |
| Sequential journey | `forecast_with_spaces.ts` | 88–132 | 9 `it()` blocks have implicit ordering: job must be opened before forecast, datafeed must run before forecast, forecast must exist before delete tests | Reorganise into 3–4 independent `test()` blocks that each set up their own preconditions, or one combined `test()` for the stateful journey |
| Retry wrapper | `forecast_with_spaces.ts` | 49–61 | `retry.tryForTime(10000, async () => { ... })` around the delete-forecast request | In Scout, replace with a direct call (the retry was likely guarding against eventual-consistency in FTR; Scout's async handling is sufficient) |
| Missing cleanup | `create.ts` | — | Calls `ml.api.cleanMlIndices()` in `after`, but no cleanup of the farequote archive (acceptable since `loadIfNeeded` is idempotent and ML jobs are deleted) | Drop the `esArchiver.loadIfNeeded` call in the Scout version (not needed — the test never reads from the archive) |
| Over-privileged setup | `get_buckets.ts` | `before` | Jobs and datafeeds are created at the suite level (`before`) with no explicit auth — `ml.api.*` uses an internal admin-level client | In Scout, use `apiServices.ml.anomalyDetection.createViaKibana()` (no SAML auth needed for setup; auth is only relevant to the endpoint under test) |

---

## 10. Migration batches

### Batch 1: Simple CRUD — no datafeed or farequote needed

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `anomaly_detectors/create.spec.ts` | `create.ts` | simple | Drop `esArchiver.loadIfNeeded` — not needed; use `samlAuth.asMlPoweruser()` and `samlAuth.asMlViewer()`; add `createViaKibana` with no space |
| 2 | `anomaly_detectors/create_with_datafeed.spec.ts` | `create_with_datafeed.ts` | simple | Drop `esArchiver.loadIfNeeded`; single ML_POWERUSER test |
| 3 | `anomaly_detectors/create_with_spaces.spec.ts` | `create_with_spaces.ts` | simple | Needs `createViaKibana(config, spaceId)` overload and a local `assertJobSpaces` helper |
| 4 | `anomaly_detectors/delete_with_spaces.spec.ts` | `delete_with_spaces.ts` | simple | Uses existing `waitForJobToExist` / `waitForJobNotToExist` |
| 5 | `anomaly_detectors/get.spec.ts` | `get.ts` | simple | Flatten 4 nested describes into a single `test.describe`; 8 `test()` blocks |

- **Human involvement**: `autopilot` for `create`, `create_with_datafeed`, `delete_with_spaces`, `get`. `guided` for `create_with_spaces` (needs `assertJobSpaces` helper and `createViaKibana` space support).
- **Dependencies**: none
- **Blockers**: `createViaKibana` space parameter (add to `@kbn/scout` ML service) and `assertJobSpaces` local helper.

### Batch 2: Space lifecycle and GET tests

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 6 | `anomaly_detectors/get_with_spaces.spec.ts` | `get_with_spaces.ts` | medium | 10 `test()` blocks; needs `createViaKibana(config, spaceId)` |
| 7 | `anomaly_detectors/get_stats_with_spaces.spec.ts` | `get_stats_with_spaces.ts` | medium | Near-identical pattern to `get_with_spaces.spec.ts` |
| 8 | `anomaly_detectors/open_with_spaces.spec.ts` | `open_with_spaces.ts` | medium | Needs `openAnomalyDetectionJob`, `closeAnomalyDetectionJob`, `waitForJobState` helpers |
| 9 | `anomaly_detectors/close_with_spaces.spec.ts` | `close_with_spaces.ts` | medium | Same helpers as `open_with_spaces.spec.ts`; also needs `openAnomalyDetectionJob` in `beforeEach` |

- **Human involvement**: `guided` — `openAnomalyDetectionJob`, `closeAnomalyDetectionJob`, `waitForJobState` need to be added to `@kbn/scout` `MlADJobsApi` before coding starts.
- **Dependencies**: `createViaKibana` with `spaceId` (from Batch 1); new ML service helpers.
- **Blockers**: `openAnomalyDetectionJob`, `closeAnomalyDetectionJob`, `waitForJobState` missing from `@kbn/scout`.

### Batch 3: Datafeed-dependent tests

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 10 | `anomaly_detectors/get_buckets.spec.ts` | `get_buckets.ts` | complex | Needs `createDatafeed`, `startDatafeed`, `waitForDatafeedState`; NEEDS VERIFICATION on farequote data loading |
| 11 | `anomaly_detectors/get_overall_buckets.spec.ts` | `get_overall_buckets.ts` | complex | Same as `get_buckets`; two datafeeds |
| 12 | `anomaly_detectors/forecast_with_spaces.spec.ts` | `forecast_with_spaces.ts` | complex | Refactor sequential journey into independent `test()` blocks; add `assertForecastResultsExist` local helper; needs `startDatafeed`, `waitForDatafeedState`, `waitForJobState`, space-scoped job/datafeed creation |

- **Human involvement**: `guided` — farequote data loading strategy must be confirmed before coding; new datafeed helpers needed in `@kbn/scout`.
- **Dependencies**: All Batch 1 and Batch 2 helpers; `createDatafeed`, `startDatafeed`, `waitForDatafeedState` in `@kbn/scout` ML service.
- **Blockers**: 
  - NEEDS VERIFICATION: Is `ft_farequote` pre-seeded in the Scout stateful cluster, or does each `beforeAll` need to call `esArchiver.loadIfNeeded`?
  - `createDatafeed`, `startDatafeed`, `waitForDatafeedState` missing from `@kbn/scout` ML service.

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 13 (12 test + 1 index) |
| > API tests | 12 |
| > Dropped | 0 (index.ts only) |
| > Deferred | 0 |
| New page objects needed | 0 |
| New API services needed | 1 datafeed sub-service (`datafeeds.create/start/waitForState`) in `@kbn/scout` |
| New ML API helpers in `@kbn/scout` | 5: `createViaKibana(spaceId)`, `openAnomalyDetectionJob`, `closeAnomalyDetectionJob`, `waitForJobState`, `cleanMLSavedObjects` |
| Local helpers in spec dir | 2: `assertJobSpaces`, `assertForecastResultsExist` |
| `data-test-subj` additions to source code | 0 (API tests, no DOM) |
| Custom server config sets | 0 |
| Migration batches | 3 |

### Risks and open questions

- **NEEDS VERIFICATION**: Is `ft_farequote` (the Scout index name for the farequote dataset) pre-seeded in the Scout stateful cluster, or does each Batch 3 spec need to call `esArchiver.loadIfNeeded` in `beforeAll`? Answer before starting Batch 3.
- **NEEDS VERIFICATION**: Do the ML anomaly detection `/_open`, `/_close`, `/_forecast`, and stats endpoints work the same way in the serverless observability/security projects as in stateful? Checking whether to add `...tags.serverless.observability.complete, ...tags.serverless.security.complete` to all specs.
- **NEEDS VERIFICATION**: Does `ml.testResources.setKibanaTimeZoneToUTC()` need a Scout equivalent, or is the Scout test cluster always UTC? If the cluster timezone is already UTC (typical for CI), this call can be dropped entirely.
- **`@kbn/scout` ML service additions**: This plan calls for adding 5 new methods to `MlADJobsApi` and a new `datafeeds` sub-service. These changes need to land in `@kbn/scout` before Batch 2 and Batch 3 can be executed. Consider opening a separate PR for the `@kbn/scout` additions first.
- **`forecast_with_spaces.ts` reorganisation**: The sequential-journey smell requires judgement about how to split the 9 `it()` blocks into independent `test()` blocks. The key constraint is that `forecastId` (returned by the run-forecast call) is needed for the delete-forecast calls. One clean approach: combine "run forecast + assert results + delete (unauthorized) + delete (authorized)" into one `test()` using `test.step()`, and keep the pre-condition failures (non-opened job, no data, invalid ID, wrong space, invalid duration, viewer) as independent `test()` blocks.
