# Scout Migration Guide: Cypress → Scout/Playwright

> A knowledge base built during the migration of Osquery Cypress tests to Scout/Playwright.
> Use this guide when migrating other Cypress test suites or writing new Scout tests.
>
> **IMPORTANT: Keep this document alive!** When working on Scout tests, always add new
> findings, best practices, bad practices, and tips to this guide. Future agents and
> developers should never have to rediscover the same lessons twice. After fixing a
> non-trivial issue, add it here immediately.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Differences: Cypress vs Scout](#key-differences-cypress-vs-scout)
3. [Project Structure](#project-structure)
4. [Step-by-Step Migration Checklist](#step-by-step-migration-checklist)
5. [Common Patterns & Mappings](#common-patterns--mappings)
6. [Page Objects](#page-objects)
7. [API Helpers](#api-helpers)
8. [Fixtures & Test Lifecycle](#fixtures--test-lifecycle)
9. [Custom Roles & Authentication](#custom-roles--authentication)
10. [Docker Infrastructure (Fleet/Agents)](#docker-infrastructure-fleetagents)
11. [Selectors & Locators](#selectors--locators)
12. [Assertions](#assertions)
13. [Timing & Waits](#timing--waits)
14. [Cross-Platform Considerations](#cross-platform-considerations)
15. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
16. [Hard-Won Lessons](#hard-won-lessons-from-osquery-migration)
17. [Anti-Patterns](#anti-patterns-things-to-never-do)
18. [CI/CD Integration](#cicd-integration)
19. [Debugging Tips](#debugging-tips)
20. [Migration Status](#migration-status)

---

## Architecture Overview

### Cypress (old)
- Each spec gets a **fresh Kibana/ES stack** via FTR (Functional Test Runner)
- Tests run sequentially, one browser per spec
- Heavy CLI-based setup via `.buildkite/` scripts
- Docker containers managed by FTR config

### Scout (new)
- **Single shared Kibana/ES instance** for all tests in a config
- Tests run sequentially by default (can be parallelized with Playwright sharding)
- `globalSetupHook` for one-time infrastructure provisioning
- Docker containers managed explicitly in `global.setup.ts`

### Key Implication
**Test isolation is YOUR responsibility** in Scout. Each test must:
- Create its own data in `beforeAll`/`beforeEach`
- Clean up in `afterAll`/`afterEach`
- Use unique names (timestamps or random strings)
- Never depend on data from other tests

---

## Key Differences: Cypress vs Scout

| Aspect | Cypress | Scout/Playwright |
|--------|---------|-----------------|
| **Runner** | Cypress CLI | Playwright via `node scripts/scout.js` |
| **Config** | `cypress.config.ts` | `playwright.config.ts` + `stateful.config.ts` |
| **Selectors** | `cy.getBySel('name')` | `page.testSubj.locator('name')` |
| **Assertions** | `should('be.visible')` | `expect(locator).toBeVisible()` |
| **Async model** | Automatic chaining | Explicit `async/await` |
| **Waits** | Automatic retry | Explicit waits + timeouts |
| **Auth** | `cy.login(role)` | `browserAuth.loginWithCustomRole(role)` |
| **API calls** | `cy.request()` | `kbnClient.request()` |
| **Navigation** | `navigateTo('/app/...')` | `page.gotoApp('osquery')` or `page.goto('/app/...')` |
| **Test data** | Created in `before()`/`beforeEach()` | Created in `test.beforeAll()`/`test.beforeEach()` |
| **Test isolation** | Fresh stack per spec | Shared instance — manual cleanup required |

---

## Project Structure

```
plugin/test/scout_osquery/
├── common/
│   ├── api_helpers.ts        # Reusable API functions (CRUD operations)
│   ├── roles.ts              # Custom role definitions (KibanaRole)
│   └── constants.ts          # Shared constants (timeouts, etc.)
├── ui/
│   ├── playwright.config.ts  # Playwright configuration
│   ├── tsconfig.json         # TypeScript config with kbn_references
│   ├── fixtures/
│   │   ├── index.ts          # Test fixture extending @kbn/scout-security
│   │   └── page_objects/
│   │       ├── index.ts      # Page object registry
│   │       ├── live_query.ts # Page object for live query operations
│   │       ├── packs.ts      # Page object for packs operations
│   │       └── saved_queries.ts
│   └── tests/
│       ├── global.setup.ts   # Global setup (Docker, Fleet, etc.)
│       ├── live_query.spec.ts
│       ├── packs_create_edit.spec.ts
│       ├── roles/
│       │   ├── reader.spec.ts
│       │   └── t1_and_t2_analyst.spec.ts
│       ├── api/
│       │   ├── live_query_results.spec.ts
│       │   └── packs.spec.ts
│       └── tiers/           # Serverless-only (skipped)
│           └── *.spec.ts
└── SCOUT_MIGRATION_GUIDE.md  # This file
```

---

## Step-by-Step Migration Checklist

### 1. Analyze the Cypress test
- Read the Cypress spec file
- Identify: selectors, API calls, navigation, assertions, lifecycle hooks
- Note any `cy.wait()`, `cy.intercept()`, or complex chaining

### 2. Create the directory structure
- `common/` — API helpers, roles, constants
- `ui/fixtures/` — Page objects, test fixture
- `ui/tests/` — Spec files

### 3. Create `playwright.config.ts`
```typescript
import { createPlaywrightConfig } from '@kbn/scout-security';

export default createPlaywrightConfig({
  testDir: './tests',
  workers: 1,
  // Custom server config if needed:
  serversConfigDir: 'src/platform/packages/shared/kbn-scout/src/servers/configs/custom/osquery',
});
```

### 4. Create `tsconfig.json`
```json
{
  "extends": "@kbn/tsconfig-base/tsconfig.json",
  "compilerOptions": { "outDir": "target/types" },
  "include": ["**/*", "../common/**/*"],
  "kbn_references": [
    "@kbn/scout-security",
    "@kbn/scout",
    "@kbn/test"
  ],
  "exclude": ["target/**/*"]
}
```

### 5. Create fixtures (`fixtures/index.ts`)
```typescript
import { test as baseTest } from '@kbn/scout-security';
import type { OsqueryPageObjects } from './page_objects';
import { extendPageObjects } from './page_objects';

interface OsqueryTestFixtures {
  pageObjects: OsqueryPageObjects;
}

export const test = baseTest.extend<OsqueryTestFixtures>({
  pageObjects: async ({ pageObjects, page }, use) => {
    const extendedPageObjects = extendPageObjects(pageObjects, page);
    await use(extendedPageObjects);
  },
});
```

### 6. Migrate tests one-by-one
- Start with the simplest spec
- Run headfully to verify: `--headed`
- Fix issues before moving to the next

---

## Common Patterns & Mappings

### Navigation

```typescript
// Cypress
navigateTo('/app/osquery');
cy.visit('/app/security/rules');

// Scout
await page.gotoApp('osquery');
await page.goto('/app/security/rules');
```

### Clicking elements

```typescript
// Cypress
cy.getBySel('submit-button').click();
cy.contains('Submit').click();

// Scout
await page.testSubj.locator('submit-button').click();
await page.getByText('Submit').click();
```

### Typing text

```typescript
// Cypress
cy.getBySel('input-field').type('hello');
cy.getBySel('input-field').clear().type('world');

// Scout
await page.testSubj.locator('input-field').fill('hello');
await page.testSubj.locator('input-field').clear();
await page.testSubj.locator('input-field').fill('world');

// For CodeMirror editors (not regular inputs):
await editor.click();
await editor.pressSequentially('hello');
```

### ComboBox interactions

```typescript
// Cypress
cy.getBySel('comboBoxInput').type('searchText{downArrow}{enter}');

// Scout
const comboBox = page.testSubj.locator('comboBoxInput');
await comboBox.click();
await comboBox.pressSequentially('searchText');
const option = page.getByRole('option', { name: /searchText/i }).first();
await option.waitFor({ state: 'visible', timeout: 15_000 });
await option.click();
```

### Intercepting requests

```typescript
// Cypress
cy.intercept('POST', '/api/cases').as('createCase');
cy.wait('@createCase').then((interception) => { ... });

// Scout
const responsePromise = page.waitForResponse(
  (response) =>
    response.url().includes('/api/cases') &&
    response.request().method() === 'POST',
  { timeout: 30_000 }
);
// ... trigger the request ...
const response = await responsePromise;
const body = await response.json();
```

### Route modification (cy.intercept with modification)

```typescript
// Cypress
cy.intercept('POST', '/api/osquery/live_queries', (req) => {
  req.body.query = 'modified query';
});

// Scout
await page.route('**/api/osquery/live_queries', async (route) => {
  const request = route.request();
  if (request.method() === 'POST') {
    const postData = request.postDataJSON();
    postData.query = 'modified query';
    await route.continue({ postData: JSON.stringify(postData) });
  } else {
    await route.continue();
  }
});
```

---

## Page Objects

### Creating a page object

```typescript
import type { ScoutPage, Locator } from '@kbn/scout';

export class MyPageObject {
  public readonly someElement: Locator;

  constructor(private readonly page: ScoutPage) {
    this.someElement = this.page.testSubj.locator('some-element');
  }

  async navigate() {
    await this.page.gotoApp('myApp');
  }

  async doSomething() {
    await this.someElement.click();
  }
}
```

### Registering page objects

```typescript
import { createLazyPageObject } from '@kbn/scout';

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage) {
  return {
    ...pageObjects,
    myPage: createLazyPageObject(MyPageObject, page),
  };
}
```

---

## API Helpers

### Pattern for CRUD helpers

```typescript
export async function loadSomething(kbnClient: any, payload = {}): Promise<any> {
  const { data } = await kbnClient.request({
    method: 'POST',
    path: '/api/something',
    body: { ...defaults, ...payload },
  });
  return data.data; // Note: many Kibana APIs wrap in { data: { data: ... } }
}

export async function cleanupSomething(kbnClient: any, id: string): Promise<void> {
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/something/${id}`,
    });
  } catch {
    // Ignore — may already be deleted
  }
}
```

### Important notes
- Always wrap cleanup in `try/catch` to prevent cascading failures
- Use `kbnClient: any` type (avoid importing KbnClient directly due to module boundary issues)
- The `kbnClient` fixture authenticates as `elastic` superuser by default
- For space-aware APIs, prefix path with `/s/${spaceId}/`

---

## Fixtures & Test Lifecycle

### Lifecycle mapping

| Cypress | Scout |
|---------|-------|
| `before()` | `test.beforeAll()` |
| `beforeEach()` | `test.beforeEach()` |
| `after()` | `test.afterAll()` |
| `afterEach()` | `test.afterEach()` |

### Available fixtures

- `browserAuth` — Login/logout (`.loginAsAdmin()`, `.loginWithCustomRole(role)`)
- `kbnClient` — API client for Kibana
- `page` — Extended Playwright Page (ScoutPage) with `testSubj`, `gotoApp`
- `pageObjects` — Registered page objects
- `apiClient` — Alternative API client

### Important: `beforeAll` vs `beforeEach` for auth

```typescript
// Login once for all tests in describe block
test.beforeEach(async ({ browserAuth }) => {
  await browserAuth.loginWithCustomRole(socManagerRole);
});
```

---

## Custom Roles & Authentication

### Defining a custom role

```typescript
import type { KibanaRole } from '@kbn/scout-security';

export const myRole: KibanaRole = {
  elasticsearch: {
    cluster: ['all'],
    indices: [{ names: ['*'], privileges: ['all'] }],
  },
  kibana: [
    {
      feature: {
        osquery: ['all'],
        discover: ['all'],
        // ... other features
      },
      spaces: ['*'],
    },
  ],
};
```

### Using in tests

```typescript
test.beforeEach(async ({ browserAuth }) => {
  await browserAuth.loginWithCustomRole(myRole);
});
```

### Mapping Cypress roles to Scout

- `ServerlessRoleName.SOC_MANAGER` → Define as `socManagerRole: KibanaRole`
- `ServerlessRoleName.T1_ANALYST` → Define as `t1AnalystRole: KibanaRole`
- etc.

---

## Docker Infrastructure (Fleet/Agents)

### When you need Docker
- Tests that require Elastic Agents (live queries, agent-dependent features)
- Tests that need Fleet Server
- Tests that check osquery results from real agents

### Server config (`stateful.config.ts`)

Key settings for Docker agent connectivity:
```typescript
esTestCluster: {
  serverArgs: [
    'http.host=0.0.0.0', // Allow Docker containers to reach ES
  ],
},
kbnTestServer: {
  serverArgs: [
    // Fleet Server hosts — Docker containers reach host via host.docker.internal
    `--xpack.fleet.fleetServerHosts=[{"id":"default-fleet-server","name":"Default Fleet Server","is_default":true,"host_urls":["https://host.docker.internal:8220"]}]`,
    // ES output — Docker agents send data to ES via host.docker.internal
    `--xpack.fleet.outputs=[{"id":"es-default-output","name":"Default Output","type":"elasticsearch","is_default":true,"is_default_monitoring":true,"hosts":["http://host.docker.internal:${esPort}"]}]`,
    // Pre-install osquery_manager integration
    '--xpack.fleet.packages.0.name=osquery_manager',
    '--xpack.fleet.packages.0.version=latest',
  ],
},
```

### Global setup (`global.setup.ts`)

Pattern for Docker-based setup:
1. Clean up stale containers from previous runs
2. Create agent policy via API
3. Add osquery_manager integration
4. Generate Fleet enrollment token
5. Start Fleet Server container
6. Wait for Fleet Server to be healthy
7. Start Elastic Agent container(s)
8. Wait for agents to enroll
9. Run warm-up query to verify osquery is working

### Critical Docker gotchas

1. **Do NOT use `process.on('exit')` for cleanup** — it kills containers before tests finish
2. **Use `SIGINT`/`SIGTERM` handlers** and `docker rm -f` at start of setup
3. **Fleet Server must use HTTPS** (default) — agents use `FLEET_INSECURE=true` to skip cert verification
4. **ES must bind to `0.0.0.0`** for Docker containers to reach it
5. **Don't mix `xpack.fleet.agents.elasticsearch.hosts` with `xpack.fleet.outputs`** — causes config validation error

---

## Selectors & Locators

### CRITICAL: `testSubj` is only available on `ScoutPage`

```typescript
// ✅ CORRECT — page is ScoutPage
const element = page.testSubj.locator('my-element');

// ❌ WRONG — locator result is Playwright Locator, NOT ScoutPage
const parent = page.testSubj.locator('parent');
const child = parent.testSubj.locator('child'); // RUNTIME ERROR!

// ✅ CORRECT — use standard Playwright locator chaining
const parent = page.testSubj.locator('parent');
const child = parent.locator('[data-test-subj="child"]');
```

### Selector mapping cheat sheet

```typescript
// Cypress                              // Scout
cy.getBySel('name')                  → page.testSubj.locator('name')
cy.getBySel('name').within(() => {}) → const el = page.testSubj.locator('name'); el.locator(...)
cy.contains('text')                  → page.getByText('text')
cy.get('input[name="id"]')          → page.locator('input[name="id"]')
cy.get('[aria-label="Edit"]')       → page.locator('[aria-label="Edit"]')
cy.get('tbody > tr')                → page.locator('tbody > tr')
cy.get('.euiTableRow')              → page.locator('.euiTableRow')
```

### Scoping locators within a parent

```typescript
// Cypress
cy.getBySel('parent').within(() => {
  cy.getBySel('child').click();
});

// Scout
const parent = page.testSubj.locator('parent');
await parent.locator('[data-test-subj="child"]').click();
// or
await parent.getByText('some text').click();
```

---

## Assertions

### Mapping Cypress assertions to Playwright

```typescript
// Cypress                                    // Scout
.should('be.visible')                      → expect(locator).toBeVisible()
.should('not.be.visible')                  → expect(locator).not.toBeVisible()
.should('be.disabled')                     → expect(locator).toBeDisabled()
.should('be.enabled')                      → expect(locator).toBeEnabled()
.should('have.text', 'text')               → expect(locator).toHaveText('text')
.should('contain.text', 'text')            → expect(locator).toContainText('text')
.should('have.value', 'val')               → expect(locator).toHaveValue('val')
.should('be.checked')                      → expect(locator).toBeChecked()
.should('have.attr', 'href')               → locator.getAttribute('href')
.should('have.length', n)                  → expect(locator).toHaveCount(n)
.should('exist')                           → expect(locator).toBeAttached()
```

### Important: assertions need `await`

```typescript
// ✅ CORRECT
await expect(page.getByText('hello')).toBeVisible();

// ❌ WRONG — missing await, assertion won't execute
expect(page.getByText('hello')).toBeVisible();
```

---

## Timing & Waits

### Replacing `cy.wait()`

```typescript
// Cypress
cy.wait(5000);

// Scout — AVOID hard waits when possible
await page.waitForTimeout(5000); // Last resort

// Better alternatives:
await element.waitFor({ state: 'visible', timeout: 10_000 });
await page.testSubj.locator('globalLoadingIndicator').waitFor({ state: 'hidden' });
await expect(element).toBeVisible({ timeout: 30_000 });
```

### Timeout strategies

- `test.slow()` — Multiplies default timeout by 3x (60s → 180s)
- `test.setTimeout(300_000)` — Set explicit test timeout
- `{ timeout: 60_000 }` — Per-assertion timeout
- `globalSetupHook.setTimeout(600_000)` — Global setup timeout

### Polling for dynamic content

```typescript
// When content takes time to appear (e.g., waiting for agent responses)
const maxWait = Date.now() + 300_000; // 5 minutes
while (Date.now() < maxWait) {
  try {
    await expect(element).toBeVisible({ timeout: 10_000 });
    break;
  } catch {
    await page.reload();
    await page.waitForTimeout(5_000);
  }
}
```

---

## Cross-Platform Considerations

### Keyboard shortcuts

```typescript
// ❌ macOS only
await page.keyboard.press('Meta+A');
await page.keyboard.press('Meta+Enter');

// ✅ Cross-platform
await page.keyboard.press('ControlOrMeta+a');
await page.keyboard.press('ControlOrMeta+Enter');
```

### File paths
- Use `path.join()` or forward slashes
- Don't hardcode OS-specific paths

---

## Common Pitfalls & Solutions

### 1. `testSubj` on Locator (not ScoutPage)

**Problem:** `locator.testSubj.locator('child')` throws "testSubj is undefined"
**Solution:** Use `locator.locator('[data-test-subj="child"]')` instead

### 2. CodeMirror/Monaco editor interactions

**Problem:** `fill()` doesn't work on CodeMirror/Monaco editors
**Solution:** Use `click()` + `pressSequentially()`:
```typescript
await editor.click();
await editor.pressSequentially('select * from uptime;');
```

**Clearing editors:** Standard `clear()` doesn't work. Use keyboard shortcuts:
```typescript
await editor.click();
await page.waitForTimeout(500);
await page.keyboard.press('ControlOrMeta+a');
await page.waitForTimeout(200);
await page.keyboard.press('Backspace');
await page.waitForTimeout(200);
// Repeat select-all + delete for safety (editor may not clear fully on first attempt)
await page.keyboard.press('ControlOrMeta+a');
await page.keyboard.press('Backspace');
await page.waitForTimeout(200);
await editor.pressSequentially('new content');
```

**Asserting text in editors:** `getByText()` does NOT reliably find text inside Monaco/CodeMirror editors because the text is spread across multiple DOM elements. Use `toContainText` instead:
```typescript
// ❌ BAD — unreliable for code editors
await expect(parent.getByText('SELECT * FROM os_version')).toBeVisible();

// ✅ GOOD — works with code editors
await expect(parent.locator('[data-test-subj="kibanaCodeEditor"]')).toContainText(
  'SELECT * FROM os_version',
  { timeout: 30_000 }
);
```

### 3. ComboBox selection (EUI)

**Problem:** Typing doesn't trigger dropdown options, or `fill()` doesn't work on `div` comboboxes
**Solution:** EUI comboboxes use `<div>` elements, not `<input>`. Use `pressSequentially` with delay, wait for the option, then click:
```typescript
const comboBox = parent.locator('[data-test-subj="comboBoxInput"]');
await comboBox.click();
await page.waitForTimeout(500); // Allow dropdown to initialize
await comboBox.pressSequentially('searchText', { delay: 100 });

// Wait for option to appear before clicking
const option = page.locator('[role="option"]').filter({ hasText: 'searchText' }).first();
await option.waitFor({ state: 'visible', timeout: 15_000 });
await option.click();
```

**Clearing combobox before typing new value:**
```typescript
await comboBox.click();
await page.waitForTimeout(300);
await page.keyboard.press('ControlOrMeta+a');
await page.keyboard.press('Backspace');
await page.waitForTimeout(300);
await comboBox.pressSequentially('newValue');
```

**Important:** `getByRole('option', { name: ... })` matches on the accessible name, which may differ from the visible text. Use `.filter({ hasText: ... })` for text content matching:
```typescript
// ❌ May fail if accessible name differs from visible text
page.getByRole('option', { name: /^label$/i }).first();

// ✅ Matches by visible text content
page.locator('[role="option"]').filter({ hasText: 'labels' }).first();
```

### 4. `strict mode violation: resolved to N elements`

**Problem:** Locator matches multiple elements. Playwright strict mode rejects ambiguous locators.
**Solution:** Always use `.first()` when you know there may be multiple matches. This is the most common migration issue — Cypress implicitly takes the first match, Playwright does not.
```typescript
// ❌ BAD — may match multiple elements
await page.getByText('View in Discover').click();

// ✅ GOOD — always resolve to first match
await page.getByText('View in Discover').first().click();
```

**Tip:** Apply `.first()` proactively to ALL `getByText()`, `getByRole()`, and similar calls during migration unless you're sure the selector is unique.

### 5. Flaky agent-dependent tests

**Problem:** Osquery agent not ready when tests start
**Solution:** Implement warm-up query in `global.setup.ts` that polls until agents respond

### 6. Stale Docker containers

**Problem:** Containers from previous runs interfere
**Solution:** Always `docker rm -f` known container names at the START of global setup

### 7. Fleet config validation errors

**Problem:** `xpack.fleet.agents.elasticsearch.hosts should not be used when defining default outputs`
**Solution:** Use `xpack.fleet.outputs` and `xpack.fleet.fleetServerHosts` instead of legacy `agents.*` settings

### 8. New page/tab doesn't have `testSubj`

**Problem:** Pages opened via `waitForEvent('page')` are standard Playwright Pages
**Solution:** Use `newPage.locator('[data-test-subj="..."]')` instead of `newPage.testSubj`

### 9. Module boundary violations

**Problem:** ESLint prevents importing from certain plugin packages
**Solution:** Use string literals instead of imported constants, or cast types with `as any`

### 10. `kbnClient` type issues

**Problem:** Can't import `KbnClient` type due to module boundaries
**Solution:** Use `any` type for `kbnClient` parameter in helpers, or add the package to `kbn_references`

---

## Hard-Won Lessons (from Osquery Migration)

> These lessons were discovered through hours of debugging real test failures.
> They are organized by category. **Add new lessons here as you discover them.**

### Page Loading & Readiness

#### Always wait for the Kibana loading indicator to disappear

**Problem:** Tests interact with UI elements before the page is fully loaded, causing flaky failures.
**Solution:** Create a `waitForPageReady` utility and call it after every navigation:
```typescript
export async function waitForPageReady(page: ScoutPage) {
  await page.testSubj
    .locator('globalLoadingIndicator')
    .waitFor({ state: 'hidden', timeout: 60_000 });
}
```
Use it after `page.goto()`, `page.gotoApp()`, page object `navigate()` methods, and clicking links that trigger full page loads. Integrate it into every page object's `navigate()` method.

#### Add settling delays after page ready for complex pages

Some pages (like Infrastructure/Metrics inventory) render in phases. Even after the loading indicator disappears, the actual content (like waffle map nodes) may still be loading:
```typescript
await waitForPageReady(page);
await page.waitForTimeout(3000); // Allow complex page to settle
```

### Flyouts, Modals & Overlays

#### Use Escape key to close flyouts/modals instead of clicking buttons

**Problem:** Close buttons and Cancel buttons in flyouts are often intercepted by overlay masks or portal elements.
**Solution:** Use `page.keyboard.press('Escape')` which is always reliable:
```typescript
await page.keyboard.press('Escape');
await page.waitForTimeout(2000);

// If overlay mask is still present, press Escape again
const overlayMask = page.locator('.euiOverlayMask').first();
if (await overlayMask.isVisible({ timeout: 2_000 }).catch(() => false)) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
}
```

#### Close popovers with Escape after interacting with them

**Problem:** EUI popovers (like pagination controls) remain open and intercept clicks on elements behind them.
**Solution:** Always press Escape after selecting a popover option:
```typescript
await paginationButton.click();
await fiftyRowsOption.click({ force: true });
await page.keyboard.press('Escape'); // Close the popover!
await page.waitForTimeout(1000);
```

#### Handle confirmation modals explicitly

Some actions (like updating packs, deactivating items) trigger confirmation modals:
```typescript
async clickUpdatePack() {
  await this.page.testSubj.locator('update-pack-button').click();
  const confirmBtn = this.page.testSubj.locator('confirmModalConfirmButton');
  if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await confirmBtn.click();
  }
}
```

### Pagination

#### Handle accumulated test data across runs

**Problem:** Since Scout uses a shared Kibana instance, data from previous test runs accumulates. Tables that once had 3 items now have 30, requiring pagination.
**Solution:** Use robust pagination handling — iterate through pages instead of trying to change page size:
```typescript
let element = page.locator(`[aria-label="${name}"]`);
if (await element.isVisible({ timeout: 3_000 }).catch(() => false) === false) {
  const nextPageLink = page.getByRole('link', { name: 'Next page' });
  while (await nextPageLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await nextPageLink.click();
    await page.waitForTimeout(1000);
    if (await element.isVisible({ timeout: 2_000 }).catch(() => false)) {
      break;
    }
  }
}
```

**Why not change page size?** The pagination popover's "50 rows" button sometimes detaches from the DOM, and the popover stays open intercepting clicks. Clicking "Next page" links is more reliable.

### Fleet Space Awareness

#### Custom spaces require explicit Fleet resource sharing

**Problem:** When Fleet space awareness migration is completed (`use_space_awareness_migration_status: "success"`), package policies, agent policies, and agents are all scoped to specific spaces. Osquery's status endpoint checks for package policies in the current space — if it finds none, it shows "Add Osquery Manager" instead of the osquery app.

**Root cause:** In newer Kibana versions, Fleet stores package policies as `fleet-package-policies` saved objects with `namespaceType: 'multiple'`. They only exist in the space where they were created (default space during setup).

**Solution:** Share Fleet resources to custom spaces via API in `beforeAll`:
```typescript
export async function shareOsqueryPackagePoliciesToSpace(
  kbnClient: any,
  spaceId: string
): Promise<void> {
  // 1. Get osquery package policies
  const { data: policiesData } = await kbnClient.request({
    method: 'GET',
    path: '/api/fleet/package_policies?perPage=100',
  });
  const osqueryPolicies = policiesData.items.filter(
    (p: any) => p?.package?.name === 'osquery_manager'
  );

  // 2. Share package policies to the custom space
  await kbnClient.request({
    method: 'POST',
    path: '/api/spaces/_update_objects_spaces',
    body: {
      objects: osqueryPolicies.map((p: any) => ({
        type: 'fleet-package-policies', id: p.id,
      })),
      spacesToAdd: [spaceId],
      spacesToRemove: [],
    },
  });

  // 3. Share agent policies
  const agentPolicyIds = [...new Set(osqueryPolicies.map((p: any) => p.policy_id))];
  await kbnClient.request({
    method: 'POST',
    path: '/api/spaces/_update_objects_spaces',
    body: {
      objects: agentPolicyIds.map((id: string) => ({
        type: 'fleet-agent-policies', id,
      })),
      spacesToAdd: [spaceId],
      spacesToRemove: [],
    },
  });

  // 4. Reassign agents to trigger namespace updates
  // When reassigned, Fleet updates agent.namespaces to match policy.space_ids
  for (const policyId of agentPolicyIds) {
    const { data: agentsData } = await kbnClient.request({
      method: 'GET',
      path: `/api/fleet/agents?perPage=100&kuery=policy_id:${policyId}`,
    });
    for (const agent of agentsData.items) {
      await kbnClient.request({
        method: 'POST',
        path: `/api/fleet/agents/${agent.id}/reassign`,
        body: { policy_id: policyId },
      });
    }
  }
}
```

**Key insight:** Sharing the agent policy alone isn't enough. Agents have their own `namespaces` field in the `.fleet-agents` index. Reassigning them to the same policy triggers Fleet to update the agent's namespaces to match the policy's `space_ids`.

#### Cypress vs Scout environment differences

The old Cypress tests ran in an environment where Fleet space awareness migration had NOT completed (fresh install). This meant package policies used the legacy `ingest-package-policies` saved object type with `namespaceType: 'agnostic'` — visible across all spaces. Scout's persistent environment has the migration completed, making resources space-scoped. Always verify Fleet's `use_space_awareness_migration_status` via `GET /api/fleet/settings`.

### Roles & Permissions

#### Mirror Cypress role permissions exactly, then add missing ones

When migrating role definitions, start with the exact Cypress role definition, then add permissions discovered through testing:
- **Infrastructure/Metrics access:** Requires `infrastructure: ['all']` in Kibana features AND `metrics-*`, `metricbeat-*` in Elasticsearch index privileges.
- **Fleet access in custom spaces:** Requires `fleet: ['all']`, `fleetv2: ['all']` in Kibana features AND `monitor` cluster privilege in Elasticsearch.
- **Osquery in custom spaces:** Requires the Osquery integration to be visible in that space (see Fleet Space Awareness section above).

#### Don't assume all roles have the same feature access

Different roles have different feature visibility. For example, `t1_analyst` and `t2_analyst` don't have Lens permissions, so "View in Lens" is correctly hidden. Don't copy assertions from admin-level tests to restricted-role tests without verifying:
```typescript
// Admin/SOC Manager: all actions visible
await expect(page.getByText('View in Lens').first()).toBeVisible();

// T1/T2 Analyst: Lens not available
await expect(page.getByText('View in Lens').first()).not.toBeVisible();
```

### Selectors & Element Targeting

#### Waffle map host nodes are buttons, not links

In the Infrastructure/Metrics inventory page, host nodes in the waffle map are rendered as `<button>` elements (not `<a>` or `<li>` elements):
```typescript
// ❌ BAD — wrong element types
page.testSubj.locator('waffleMap').locator('.euiLink').first();
page.testSubj.locator('waffleMap').locator('li button').first();

// ✅ GOOD — target by button role with agent name
page.testSubj.locator('waffleMap')
  .getByRole('button', { name: /scout-osquery-agent/i })
  .first();
```

#### Use `role` selectors for tabs

Tab elements are best selected by their ARIA role, not text content:
```typescript
// ❌ BAD — may match non-tab elements with same text
page.getByText('Osquery').first().click();

// ✅ GOOD — specifically targets the tab
const osqueryTab = page.getByRole('tab', { name: 'Osquery' });
await osqueryTab.waitFor({ state: 'visible', timeout: 30_000 });
await osqueryTab.click();
```

#### Dismiss interfering dialogs

Some pages show dialogs that overlay content (e.g., "Want a different view?" in Metrics):
```typescript
const dismissButton = page.getByText('Dismiss').first();
if (await dismissButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
  await dismissButton.click();
  await page.waitForTimeout(1000);
}
```

### Relative URLs from `getAttribute('href')`

**Problem:** `getAttribute('href')` returns relative URLs, but `page.goto()` needs absolute URLs.
**Solution:** Construct the full URL:
```typescript
const href = await link.getAttribute('href');
if (href) {
  const baseUrl = new URL(page.url()).origin;
  await page.goto(`${baseUrl}${href}`);
}
```

### Response Interception Timing

**Problem:** `page.waitForResponse()` can miss responses if set up too late.
**Solution:** Always set up the response listener BEFORE triggering the action:
```typescript
// ✅ Set up listener BEFORE clicking submit
const responsePromise = page.waitForResponse(
  (response) => response.url().includes('/api/cases') && response.request().method() === 'POST'
);
await page.getByRole('button', { name: 'Submit' }).click();
const response = await responsePromise;
```

### Form Validation Differences

**Problem:** Some form validation messages visible in Cypress may not appear in Playwright because:
1. Cypress may trigger validation differently (implicit blur events)
2. React re-renders after component re-indexing may reset touched/dirty state
3. The validation framework may require explicit submission to show errors

**Solution:** Don't assert on transient validation messages if they're not critical to the test. Focus on testing core behavior (correct values saved, correct API payloads).

### Security Solution Initialization

When testing in custom spaces, Security Solution features may need initialization:
```typescript
// Initialize lists index (mirrors Cypress initializeDataViews)
try {
  await kbnClient.request({ method: 'POST', path: '/api/lists/index' });
} catch {
  // Ignore — may already exist
}
```

---

## Anti-Patterns (Things to NEVER Do)

### 1. Never use `fill()` on non-input elements

EUI ComboBoxes render as `<div>` elements, not `<input>`. `fill()` only works on `<input>`, `<textarea>`, and `[contenteditable]`.
```typescript
// ❌ WILL FAIL — div is not an input
await comboBox.fill('search text');

// ✅ CORRECT
await comboBox.pressSequentially('search text', { delay: 100 });
```

### 2. Never assume Cypress selectors map 1:1

Cypress's `cy.getBySel()` finds elements even if they're off-screen or inside collapsed sections. Playwright's `testSubj.locator()` finds DOM elements but `.click()` requires them to be visible and actionable.

### 3. Never skip `.first()` on ambiguous selectors

During migration, proactively add `.first()` to EVERY `getByText()`, `getByRole()`, and similar call. It's far better to be overly cautious than to chase strict mode violations.

### 4. Never rely on element order for pagination

Tables may have different data than Cypress tests expected. Always handle pagination dynamically.

### 5. Never assume the test environment is clean

Scout shares a single Kibana instance. Data from previous test runs persists:
- Pack names must be unique (use random strings)
- Saved queries accumulate
- Rules and cases accumulate
- Always use `afterAll` cleanup
- Handle pagination for accumulated data

### 6. Never close flyouts/modals by clicking overlay backgrounds

Click events on overlay backgrounds are unreliable. Always use:
- The explicit close button, OR
- `page.keyboard.press('Escape')` (most reliable)

### 7. Never use `cy.wait()` equivalents without a better alternative

Before adding `page.waitForTimeout()`, consider:
- `element.waitFor({ state: 'visible' })` — wait for specific element
- `expect(element).toBeVisible({ timeout: N })` — assertion with timeout
- `page.waitForResponse()` — wait for API response
- `page.waitForLoadState('networkidle')` — wait for network to quiet

`waitForTimeout` is a last resort for complex rendering phases.

### 8. Never hardcode URLs for navigation

```typescript
// ❌ BAD — hardcoded URL
await page.goto('http://localhost:5620/app/osquery');

// ✅ GOOD — use kbnUrl or gotoApp
await page.gotoApp('osquery');
// or for spaces:
await page.goto(kbnUrl.get(`/s/${spaceId}/app/osquery`));
```

---

## CI/CD Integration

### Running tests locally

```bash
# Headless (default)
node scripts/scout.js run-tests --stateful \
  --config x-pack/platform/plugins/shared/osquery/test/scout_osquery/ui/playwright.config.ts

# Headed (for debugging)
node scripts/scout.js run-tests --stateful \
  --config x-pack/platform/plugins/shared/osquery/test/scout_osquery/ui/playwright.config.ts \
  --headed
```

### Buildkite CI script

See `.buildkite/scripts/steps/functional/osquery_scout.sh` for the CI pipeline configuration.

### Dual-run strategy

During migration, run both Cypress and Scout pipelines:
- Cypress: existing pipeline (unchanged)
- Scout: new pipeline alongside
- Compare results to validate parity
- Only remove Cypress after Scout is stable

---

## Debugging Tips

### 1. Use `--headed` mode
Run with `--headed` to see the browser and understand what's happening.

### 2. Use `page.pause()`
Insert `await page.pause()` in your test to pause execution and inspect the page.

### 3. Check Playwright traces
Playwright generates traces on failure. Check the `test-results/` directory.

### 4. Read ES/Kibana logs
Server logs are interleaved with test output. Search for `[error]` or `[warn]` patterns.

### 5. Docker debugging
```bash
# Check running containers
docker ps

# View Fleet Server logs
docker logs fleet-server-osquery

# View Agent logs
docker logs elastic-agent-osquery-1

# Interactive shell into agent
docker exec -it elastic-agent-osquery-1 bash
```

### 6. API debugging
Use `kbnClient.request()` in `beforeAll` to verify API state before tests run.

---

## Migration Status

### Migrated (active)
- `live_query.spec.ts` — Live query functionality
- `live_query_run.spec.ts` — Custom and saved query runs
- `edit_saved_queries.spec.ts` — Saved query editing
- `packs_create_edit.spec.ts` — Pack CRUD operations
- `cases.spec.ts` — Case integration
- `custom_space.spec.ts` — Custom space support
- `metrics.spec.ts` — Infrastructure/inventory integration
- `alerts_linked_apps.spec.ts` — Alert response action linked apps
- `alerts_cases.spec.ts` — Alert-to-case integration
- `alerts_multiple_agents.spec.ts` — Multi-agent alert tests
- `alerts_automated_action_results.spec.ts` — Automated action results
- `alerts_response_actions_form.spec.ts` — Response actions form
- `roles/reader.spec.ts` — Reader role permissions
- `roles/t1_and_t2_analyst.spec.ts` — Analyst role permissions
- `roles/alert_test.spec.ts` — Alert role permissions
- `api/live_query_results.spec.ts` — API: live query results
- `api/packs.spec.ts` — API: pack operations

### Skipped (not applicable to stateful)
- `tiers/*.spec.ts` — Serverless tier tests
- `saved_queries.spec.ts` — Skipped in Cypress
- `timelines.spec.ts` — Skipped in Cypress
- `packs_integration.spec.ts` — Skipped in Cypress
- `live_query_packs.spec.ts` — Skipped in Cypress
- `ecs_mappings.spec.ts` — Skipped in Cypress
- `add_integration.spec.ts` — Skipped in Cypress
