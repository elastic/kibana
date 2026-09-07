# Fleet Test Conventions & Deletion Guidelines

---

## FTR API Integration Tests

**Location:** `x-pack/platform/test/fleet_api_integration/apis/**`

**Setup:**
- Always set `FLEET_PACKAGE_REGISTRY_PORT` to a free port.
- Run server and runner in separate terminals. Wait for server to log it's ready.
- Docker must be running — the Package Registry runs in a container.
- Use `fleet-ftr-testing` skill to pick the right `config.*.ts` for the domain.

**Conventions:**
- Use `supertest` for all API calls. Always set `kbn-xsrf: 'xxxx'` header.
- Clean up in `before` (handles crashed previous runs) AND `after` (leaves a clean state).
- Use permissive status checks in cleanup (`expect([200, 404])`) — don't fail if resource was already gone.
- Never share mutable state (policy IDs, package names, secret IDs) between `it` blocks.
- Use `esArchiver` for read-only fixture data. Unload it in `afterAll`.
- Do not use `setTimeout` — use the `retry` service for polling:
  - `retry.tryForTime(ms, fn)` — retry for a fixed duration (most common in Fleet tests)
  - `retry.tryWithRetries(description, fn, retryCount)` — retry a fixed number of times
- `before all` failures cascade to all tests in the block — always check the hook error first.

**Data cleanup audit before fixing:**

| Resource created | Cleanup method | In `before`? | In `after`? |
|---|---|---|---|
| Agent policy | `DELETE /api/fleet/agent_policies/{id}` | ☐ | ☐ |
| Package policy | `DELETE /api/fleet/package_policies/{id}` | ☐ | ☐ |
| Installed package | `DELETE /api/fleet/epm/packages/{name}/{version}` | ☐ | ☐ |
| Enrollment token | `DELETE /api/fleet/enrollment_api_keys/{id}` | ☐ | ☐ |
| Output | `DELETE /api/fleet/outputs/{id}` | ☐ | ☐ |
| Fleet server host | `DELETE /api/fleet/fleet_server_hosts/{id}` | ☐ | ☐ |

---

## Jest Server Integration Tests

**Location:** `x-pack/platform/plugins/shared/fleet/server/integration_tests/**/*.test.ts`

**Run:** `node scripts/jest_integration --testPathPattern=<path>`

Spins up its own real ES + Kibana. No Docker, no FTR config. Slower than jest unit tests.

**Conventions:**
- Same cleanup discipline as FTR: clean before and after in `beforeAll`/`afterAll`.
- Avoid parallel test pollution — jest integration tests run with concurrency, so shared indices must be namespaced or cleaned aggressively.
- Check for race conditions in setup: concurrent writes to the same Fleet SO can cause intermittent failures (see `common-flaky-patterns.md` §Race Condition).
- Use `retry` / `polling` for anything that's eventually consistent (KB indexing, package install status).

---

## Jest Unit Tests

**Location:** `x-pack/platform/plugins/shared/fleet/{public,common,server}/**/*.test.{ts,tsx}` (excluding `server/integration_tests/`)

**Run:** `yarn jest <path>` or `yarn jest --testNamePattern="<name>"`

**Conventions:**
- All external dependencies (ES client, SO client, HTTP requests) must be mocked.
- Use `jest.Mocked<typeof realModule>` for type-safe mocks — catches mock drift when interfaces change.
- React tests: wrap async state updates in `act()` or use `waitFor()`. Never assert synchronously after async operations.
- Do not use `setTimeout` or real timers — use `jest.useFakeTimers()` if timing matters.
- Clean up mocks in `afterEach` with `jest.clearAllMocks()` or per-test `jest.resetModules()`.
- If a test passes alone but fails in the suite, check for global mock pollution between tests.

**Before fixing a "mock drift" failure:**
1. `grep -n "jest.mock" <test-file>` — list all mocks.
2. Compare each mocked function signature against the current source.
3. Update the mock; do not cast with `as any` to hide the mismatch.

---

## Scout Playwright Tests

**Location:** `x-pack/platform/plugins/shared/fleet/test/scout/**`

**Conventions:**
- Use `data-test-subj` selectors only — never CSS classes or positional selectors.
- Never use `page.waitForTimeout(ms)` — use `expect(locator).toBeVisible()` or `page.waitForResponse()`.
- Role-based fixtures must match the exact privilege set under test. When Fleet adds a new privileged action, update the corresponding fixture.
- Clean up created resources via API in fixture teardown — not via UI steps.
- For RBAC tests: verify both that privileged actions are available to authorized roles AND that they are absent for lower-privilege roles.

---

## Test Deletion Guidelines

### When to delete

- Full duplicate coverage exists at a lower layer (jest unit covers the same assertion as an FTR API test).
- Skipped for >180 days with no progress and no assignee.
- Validates purely cosmetic/visual behavior with no functional coverage value.
- Feature is deprecated or removed.
- Effort to fix exceeds the coverage value (rare — document the decision).

### When to fix

- Tests a unique integration concern not covered at a lower layer.
- Catches real bugs other tests miss.
- Fix is straightforward (race condition, missing cleanup, wrong assertion).
- Tests a critical Fleet user journey (enrollment, policy deployment, package install).

### Deletion process

1. Verify duplicate coverage — document the exact file + test name that covers the same behavior.
2. Remove the `.skip` and the test.
3. Run `grep -r "<test-name or unique assertion string>"` to check for orphaned helper code.
4. Delete orphaned helpers if they are only used by the deleted test.
5. Close the linked GitHub issue with a comment citing: the deletion commit, what covers the behavior now, or why the behavior is no longer relevant.

### Closing comment template (for stale issues)

```
This test was removed in <commit/PR> because:
- [test file no longer exists / feature was removed in PR #N / behavior is now covered by <file>]

No further action needed. Closing.
```

---

## Flaky Test Process

1. Test starts failing in CI → GitHub issue created automatically by `kbn-failed-test-reporter-cli`.
2. If failures exceed threshold → test is skipped; issue gets `blocker` + `skipped-test` labels.
3. Owning team investigates → root cause, fix or delete.
4. Fix verified → unskip the test + close the issue.

**Skip comment convention (always include the issue link):**
```typescript
// Failing: See https://github.com/elastic/kibana/issues/NNNNN
describe.skip('My test', ...);
```

**Skip budget:** No `.skip` older than 90 days. After 90 days, fix it in the current sprint or delete the test. An unactioned skip is not protecting anything.

---

## Flaky Runner — How to Trigger

For FTR and Scout tests only (jest is not supported by the CI flaky runner):

1. Go to [ci-stats.kibana.dev/trigger_flaky_test_runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner).
2. Pick the PR or branch.
3. For FTR: use `type: "ftrConfig"` with the full path to the `config.*.ts`.
4. For Scout: use `type: "scoutConfig"`.
5. Use 25 runs as the default. Pass 25/25 → safe to unskip; fail ≥1/25 → investigate further.

**For jest tests:** loop locally instead:
```bash
# Jest server integration
for i in {1..25}; do
  node scripts/jest_integration --testPathPattern=<path> \
    && echo "PASS $i" || { echo "FAIL $i"; break; }
done

# Jest unit
for i in {1..10}; do
  yarn jest <path> && echo "PASS $i" || { echo "FAIL $i"; break; }
done
```

If it passes 9/10 or more locally after a long silence with no recent test-file commits → safe to unskip. If it consistently fails → it's a `fix` verdict, not `flaky-rerun`.
