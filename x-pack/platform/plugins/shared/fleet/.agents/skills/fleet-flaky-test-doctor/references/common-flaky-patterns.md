# Fleet Common Flaky Patterns

Fleet-specific failure patterns. Check this before guessing at a root cause.

## How to use this file

This is a **living document**. It starts with known patterns and grows over time as the skill is used.

When the skill identifies a root cause not already documented here, it will say so and offer to add an entry. If you accept, the skill will append a new section following the format of the existing entries (Symptom / Cause / Fix / Cluster signal). You then decide whether to commit the addition — keeping it in the repo means the pattern is available to the whole team in future sessions.

**To add a pattern manually:** append a new `##` section at the bottom of this file with the same structure. Commit it to the branch you're working on so it persists.

---

## Shared Saved Object State Between Tests

**Symptom:** Test passes in isolation, fails in the full suite. Assertion errors about unexpected data (extra policies, wrong counts, unexpected package versions).

**Cause:** FTR API integration and jest server integration tests share a live ES/Kibana instance. A previous test creates a policy or package and fails to clean it up.

**Fix:** Ensure `before`/`after` (FTR) or `beforeEach`/`afterEach` (jest) delete all resources the test creates, using a permissive status check so cleanup doesn't fail on already-missing resources:

```typescript
// FTR
before(async () => {
  await supertest
    .delete(`/api/fleet/agent_policies/${POLICY_ID}`)
    .set('kbn-xsrf', 'xxxx');
  // 200 or 404 are both fine
});
```

**Cluster signal:** Multiple tests in the same file fail; each works individually.

---

## Package Registry Unavailable / Timeout

**Symptom:** `before all` hook failure mentioning the package registry; tests that install packages return 500 or timeout.

**Cause:** The Docker-based Package Registry container hasn't started, crashed, or isn't reachable on `FLEET_PACKAGE_REGISTRY_PORT`.

**Fix (local):** Ensure Docker is running before starting the FTR server. Use a free port:

```bash
FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/platform/test/fleet_api_integration/config.epm.ts
```

**Fix (CI flake):** If this only fails in CI, check whether the `before all` hook has sufficient retry on registry readiness. Strong `flaky-rerun` candidate.

---

## `before all` Hook Failure Masking All Tests

**Symptom:** All tests in a `describe` block appear failed; the actual error is in `before all` (Mocha FTR) or `beforeAll` (jest). Looks like 10 failures but is really 1.

**Cause:** Setup step failed — registry unavailable, SO initialization failed, prerequisite API returned non-200.

**Diagnosis:** Look at the `before all` error, not the individual test failures. The individual failures are consequences.

**Action:** Treat as one issue. Issues sharing the same `before all` failure are a cluster — fix the setup, all tests pass.

---

## Race Condition in Concurrent Setup (Jest Integration)

**Symptom:** `enableSpaceAwareness` or similar setup tests fail intermittently when multiple Kibana instances start simultaneously. Timing-dependent.

**Cause:** Concurrent Kibana instances racing to initialize the same SO indices or Fleet setup records.

**Fix pattern:** Add a retry with backoff on the conflicting operation:

```typescript
await retry.try(async () => {
  const setup = await fleetSetup.isInitialized();
  if (!setup) throw new Error('Fleet not yet initialized');
});
```

---

## Policy Secrets: Secrets Deleted Before Use

**Symptom:** Tests in `policy_secrets.ts` fail with missing or unexpected secrets. `after each` hook failures cascade.

**Cause:** Shared secret IDs across test cases — cleanup in one test's `afterEach` removes a secret still referenced by another test's live policy.

**Fix:** Each test case creates its own secrets and cleans them up independently. Do not share secret IDs across test cases.

---

## Knowledge Base / Asset Retrieval After Install

**Symptom:** Tests reading KB content or package assets after installation fail with empty results or 404.

**Cause:** Installation is async — KB indexing or asset registration hasn't completed by the time the test asserts.

**Fix:** Poll/retry on the assertion:

```typescript
await retry.try(async () => {
  const { body } = await supertest
    .get(`/api/fleet/epm/packages/${PACKAGE_NAME}/${VERSION}/assets`)
    .expect(200);
  expect(body.items).toHaveLength(expectedCount);
});
```

---

## Jest `act()` Warning / React State Update

**Symptom:** Jest unit test logs `Warning: An update to X inside a test was not wrapped in act(...)`. May pass but with warnings, or fail intermittently.

**Cause:** Async state update (mock API call or `useEffect`) completes outside React's `act()` boundary.

**Fix:**

```typescript
// Flaky
render(<MyComponent />);
expect(screen.getByText('loaded')).toBeInTheDocument();

// Stable
render(<MyComponent />);
await waitFor(() => expect(screen.getByText('loaded')).toBeInTheDocument());
```

---

## Mock Drift in Jest Unit Tests

**Symptom:** Jest unit test fails after a production service/type change but the mock still uses the old interface.

**Cause:** Mocks aren't updated when the real interface changes.

**Diagnosis:** Compare `jest.mock(...)` calls and manual mock files against the current service/function signature.

**Fix:** Update the mock to match the current interface. Use `jest.Mocked<typeof realModule>` to get type-checking on mocks.

---

## `esArchiver` Data Removed by Sibling Test

**Symptom:** A jest server integration test relying on `esArchiver` data fails because a previous test's teardown removed it.

**Cause:** Tests share an ES instance; one test's `afterAll` cleanup removes data another test loaded.

**Fix:** Each test suite loads its own fixtures in `beforeAll`/`beforeEach` and unloads them in `afterAll`/`afterEach`. Never rely on data loaded by a sibling suite.

---

## Scout: Stale Locator After Re-render

**Symptom:** Scout Playwright test fails with "element is not attached to the DOM" or assertion on wrong element.

**Cause:** Locator was resolved before a re-render detached and replaced the element.

**Fix:** Avoid storing element references; let Playwright re-evaluate lazily:

```typescript
// Stale
const btn = await page.locator('[data-test-subj="addAgent"]');
await page.reload();
await btn.click(); // stale after reload

// Stable
await page.reload();
await page.locator('[data-test-subj="addAgent"]').click();
```

---

## Scout: Role/Privilege Fixture Mismatch (Cluster H)

**Symptom:** "Viewer role can't perform write actions" tests fail because an action is unexpectedly enabled/disabled.

**Cause:** A Fleet UI feature was added/changed without updating the RBAC test fixtures, or the privilege definition changed.

**Diagnosis:**
1. Check current privilege definitions in the Fleet plugin (`common/types/models/` or `server/types/`).
2. Compare with the role fixture used in the Scout test.
3. Check recent commits touching Fleet UI components that gate actions on privilege.

**Fix:** Update the Scout role fixture to match the current privilege model, or fix the UI component to correctly gate on the privilege.
