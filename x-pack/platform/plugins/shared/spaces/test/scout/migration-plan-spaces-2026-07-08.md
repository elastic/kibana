# FTR to Scout Migration Plan

| Field | Value |
|-------|-------|
| Source | `x-pack/platform/test/functional/apps/spaces/` (+ `x-pack/platform/test/accessibility/apps/group1/spaces.ts`) |
| Target module root | `x-pack/platform/plugins/shared/spaces/test/scout` |
| Generated | 2026-07-08 |
| Deployment targets | both (stateful primary; serverless already partially covered) |
| FTR config chain | `x-pack/platform/test/functional/apps/spaces/config.ts` > `x-pack/platform/test/functional/config.base.ts` > `@kbn/test-suites-src/functional/config.base` |

Tracking issue: [elastic/kibana#277064](https://github.com/elastic/kibana/issues/277064) (part of #277061).

---

## 1. Test inventory

Sorted by estimated complexity (simple to complex).

| # | FTR file (relative) | Type | Description | `it` count | Complexity | Decision | Justification |
|---|---------------------|------|-------------|-----------|------------|----------|---------------|
| 1 | `apps/spaces/index.ts` | index | Loads all 6 spaces suites under one `describe` | - | - | split | Each `loadTestFile` target becomes its own spec (already effectively separate files) |
| 2 | `apps/spaces/spaces_grid.ts` | test | Spaces listing/grid page: row count, details page, space-switcher visibility, switching space from details page | 4 | simple | UI test | Real navigation + rendering assertions on the grid/details views |
| 3 | `apps/spaces/create_edit_space/index.ts` | index | Loads `create_edit_space.ts` only | - | - | drop (fold in) | Trivial single-file loader; not migrated as its own artifact |
| 4 | `apps/spaces/create_edit_space/create_edit_space.ts` | test | Create space, edit initials/avatar (logo upload), solution-view panel + solution switch, feature toggles on API-created space | 6 | medium | UI test | Core CRUD flows through the real form; logo upload needs a real file input |
| 5 | `apps/spaces/copy_saved_objects.ts` | test | Copy-to-space flyout: plain copy, conflict resolution, `createNewCopies`, circular references | 4 | medium | UI test | Exercises the interactive flyout with real conflict/resolution UI; a Scout page object already exists for this flyout (see §6) |
| 6 | `apps/spaces/feature_controls/spaces_security.ts` | test | Feature-controlled visibility of Spaces management for `global_all`, `default-space-only`, and `nondefaultspace`-scoped custom roles | 12 | medium | split + UI test | Three distinct roles/personas exercising real navigation-guard behavior; split into one spec per persona for clarity and independent parallelism |
| 7 | `apps/spaces/spaces_selection.ts` | test | Login space selector, space nav menu switching, search-in-popover, "separate data per space" (sample data dashboards) | 7 | medium/complex | split; partial drop | Space-selector/search/nav flows → UI tests. The "Spaces Data" describe (2 `it`s) that loads Kibana sample data and renders dashboards duplicates dashboard-rendering coverage already owned by the dashboard app and does not test anything spaces-specific beyond basePath routing — **recommend dropping** those 2 `it`s (see Tests to drop) |
| 8 | `apps/spaces/enter_space.ts` | test | `next` route validation/normalization after space selection (malformed default route, path traversal `../..`, absolute URL redirect, hash/query preservation) | 7 | complex | split into API + UI | This is fundamentally a **URL-sanitization/security** behavior. The core logic (malformed route fallback, `../../` normalization, external-URL rejection) is pure input→output and does not require rendering the app the route points to — recommend an **API test** hitting `GET /internal/spaces/_enter` (or whatever endpoint issues the redirect) asserting the `Location` header for each malformed/traversal/external case. Keep **one** UI test (`allows user to navigate to different spaces, respecting the configured default route`) as a smoke test that the redirect actually lands in the real app. CONFIRMED space-entry redirect happens server-side |
| 9 | `apps/accessibility/apps/group1/spaces.ts` | test (a11y) | a11y snapshots for: manage-spaces menu, manage-spaces page, create-space page, color picker, feature-category toggle, space listing, edit space, delete-space confirm, space-selection page | 9 | medium | fold into UI specs as inline `page.checkA11y()` | Per issue, fold a11y into the relevant UI specs rather than a separate suite |

### Proposed file splits

- `apps/spaces/feature_controls/spaces_security.ts` (12 `it` across 3 role describes), split into:
  - `feature_controls_global_all.spec.ts` (`global_all_role`, 4 `it`)
  - `feature_controls_default_space_only.spec.ts` (`default_space_all_role`, 4 `it`)
  - `feature_controls_nondefault_space.spec.ts` (`nondefault_space_specific_role`, 2 `it`)
- `apps/spaces/spaces_selection.ts` (7 `it` across 4 describes), split into:
  - `spaces_selection_login.spec.ts` (Login Space Selector, Space Navigation Menu — 2 `it`)
  - `spaces_selection_search.spec.ts` (Search spaces in popover — 3 `it`)
  - drop "Spaces Data" describe (2 `it`) — see Tests to drop
- `apps/spaces/enter_space.ts` (7 `it`), split into:
  - `enter_space_routing.spec.ts` (API test — malformed default route, `../../` traversal, external-URL rejection, hash/query preservation: covers 5 of the 7 `it`s)
  - `enter_space_navigation.spec.ts` (UI test — the 2 `it`s that actually assert space switching lands in the real app: "falls back to the default home page..." and "allows user to navigate to different spaces, respecting the configured default route")

### Tests to drop

- `apps/spaces/spaces_selection.ts` → `describe('Spaces Data')` (2 `it`s: "in the default space" / "in a custom space"): loads the Kibana "logs" sample data set and asserts a specific dashboard renders in both the default and a custom space. The only spaces-specific behavior here is that the dashboard renders under `/s/<space>/app/dashboard`, which is already implicitly covered by every other spec in this plan that navigates within a non-default space (e.g. `copy_saved_objects`, `spaces_grid`). Dashboard-rendering correctness itself is owned by the dashboard app's own Scout suite. Dropping avoids a slow, sample-data-dependent test that duplicates coverage; if reviewers want an explicit "space-scoped app renders" smoke test, it can be a single assertion added to `spaces_grid.spec.ts` instead of a full sample-data load.

### Tests to defer

_(none — no missing Scout capability blocks any of the above; `NEEDS VERIFICATION` items in the table are decisions, not blockers)_

---

## 2. Test type routing

### UI tests

| FTR file | Proposed spec path | Key flows covered |
|----------|--------------------|-------------------|
| `spaces_grid.ts` | `ui/tests/spaces_grid.spec.ts` | Grid row count, details page header/switcher visibility, switch-space-from-details |
| `create_edit_space/create_edit_space.ts` | `ui/tests/create_edit_space.spec.ts` | Create space, edit initials, edit avatar (logo upload), solution-view panel + switch, feature toggle w/ unset solution. Inline a11y snapshots folded in (create page, color picker, feature-category toggle, edit page) |
| `copy_saved_objects.ts` | `ui/tests/copy_saved_objects.spec.ts` | Plain copy, conflict resolution, createNewCopies, circular references (reuses existing `CopySavedObjectsToSpaceFlyout` page object from `saved_objects_management`) |
| `feature_controls/spaces_security.ts` | `ui/tests/feature_controls_global_all.spec.ts`, `feature_controls_default_space_only.spec.ts`, `feature_controls_nondefault_space.spec.ts` | Per-persona navigation-guard checks for Spaces management |
| `spaces_selection.ts` (partial) | `ui/tests/spaces_selection_login.spec.ts`, `spaces_selection_search.spec.ts` | Login space selector + nav-menu switching; search-in-popover. Inline a11y snapshots folded in (manage-spaces menu, manage-spaces page, listing page, space-selection page) |
| `enter_space.ts` (partial) | `ui/tests/enter_space_navigation.spec.ts` | Smoke test: default-route redirect lands in the real app after space switch |
| `group1/spaces.ts` (a11y, folded) | distributed across the specs above | See §9 mapping table |
| `spaces_grid.ts` — delete-space a11y case | `ui/tests/create_edit_space.spec.ts` (delete-confirm step) | a11y snapshot of delete-space confirm modal |

### API tests

| FTR file | Proposed spec path | Why API not UI |
|----------|--------------------|----------------|
| `enter_space.ts` (partial) | `api/tests/enter_space_routing.spec.ts` | Route/URL normalization and malformed-input handling is server-side redirect logic; no rendering needed for 5 of 7 cases |

### Unit tests (RTL/Jest)

_(none proposed — no isolated component logic identified that would be better covered by RTL than by the UI/API tests above)_

---

## 3. Parallelism plan

### Parallel-safe (can be space-isolated)

| Proposed spec | Why parallel-safe |
|--------------|------------------|
| `spaces_grid.spec.ts` | Creates/deletes its own uniquely-named spaces; no global mutation |
| `create_edit_space.spec.ts` | Creates/deletes its own uniquely-named spaces (faker-based names); avatar/logo upload is scoped to the created space |
| `copy_saved_objects.spec.ts` | Operates on dedicated `marketing`/`sales`-equivalent spaces seeded via API; only reads/writes space-scoped saved objects |
| `feature_controls_*.spec.ts` (all 3) | Each creates its own role/user/space combo and tears it down; no shared state between the 3 specs |
| `spaces_selection_search.spec.ts` | Only reads spaces via the nav popover; no mutation beyond space creation in `before` |
| `enter_space_routing.spec.ts` (API) | Reads/writes `uiSettings` scoped to its own dedicated space |

### Must be sequential

| Proposed spec | Why sequential |
|--------------|---------------|
| `spaces_selection_login.spec.ts` | Uses `forceLogout`/re-login flows tied to the space-selector-on-login behavior; login state is process-wide (browser context), so these must not interleave with other specs' auth state within the same worker. Scout's per-test isolated browser context should make this safe to run in the default parallel pool, but flag for verification during execution since the original FTR suite explicitly ordered logout before/after each block to avoid flakiness |
| `enter_space_navigation.spec.ts` | Same login/logout sensitivity as above |

Both "must be sequential" entries are about *login-state flakiness observed in FTR*, not about shared server-side state — Scout's per-worker browser context isolation likely already resolves this, but call it out for the executor to watch during iteration (§ FTR test smells, "Missing cleanup / login flakiness").

---

## 4. Test data and setup

### Archives inventory

| Archive path | Contents | Size | Used by (files) | Verdict |
|-------------|----------|------|-----------------|---------|
| `x-pack/platform/test/functional/fixtures/kbn_archives/spaces/copy_saved_objects_default_space.json` | 1 index-pattern (`logstash-*`), 1 visualization, 3 dashboards (`my-dashboard`/"A Dashboard", `dashboard-bar`, `dashboard-foo`/"Dashboard Foo") in default space | ~17KB | `copy_saved_objects.ts` | Keep — replace `kibanaServer.importExport.load` with `kbnClient.importExport.load` in the new spec (same file, same path) |
| `x-pack/platform/test/functional/fixtures/kbn_archives/spaces/copy_saved_objects_sales_space.json` | 1 index-pattern (`logstash-*`) loaded into `sales` space (creates the conflict target) | ~13KB | `copy_saved_objects.ts` | Keep — loaded with `{ space: 'sales' }` |
| `x-pack/platform/test/functional/fixtures/kbn_archives/canvas/default` | Canvas workpads (only needed so the "canvas" app link/route exists) | n/a | `enter_space.ts` | Keep for `enter_space_routing.spec.ts` / `enter_space_navigation.spec.ts` — needed because the test asserts redirecting to `/app/canvas` |
| `create_edit_space/acme_logo.png` | Small PNG (3.2KB) used as a custom space avatar image | ~3.2KB | `create_edit_space.ts` | Keep — copy alongside the new spec (e.g. `ui/fixtures/acme_logo.png`) since Scout specs conventionally colocate small binary fixtures with the test that uses them |

### UI settings mutations

| FTR call | Semantics | Files |
|----------|-----------|-------|
| `kibanaServer.uiSettings.replace({ defaultRoute, buildNum, 'dateFormat:tz' }, { space: 'another-space' })` | Wipes all space-scoped settings, then sets the 3 listed keys | `enter_space.ts` (multiple call sites, different `defaultRoute` values per scenario) |
| Root-level `config` saved-object `attributes.defaultRoute = 'http://example.com/evil'` update | Direct saved-object mutation simulating a malicious/malformed global default route | `enter_space.ts:before` |

Both mutations are exactly what the API test (`enter_space_routing.spec.ts`) needs to set up each malformed-route scenario — carry them over as `kbnClient.uiSettings.replace(...)` / `kbnClient.savedObjects.update(...)` calls in test setup, not as page-object actions.

### Shared constants to extract

None recommended. Space IDs/names used across files (`marketing`, `sales`, `nondefaultspace`, etc.) are scenario-specific and only appear within a single new spec each — inlining is clearer than a shared constants file. `SPACES` constants already exported from `x-pack/platform/plugins/shared/spaces/test/scout/api/constants.ts` (`SPACES.DEFAULT`, `SPACES.SPACE_1`, `SPACES.SPACE_2`) should be reused where a spec just needs "a second space" rather than inventing a new name.

### Fresh server required

_(none)_

---

## 5. Auth and roles

### Role inventory

| Role name | Source | Privileges (summary) | Used by (files) | Scout role target | Notes |
|-----------|--------|---------------------|-----------------|-------------------|-------|
| default FTR user (superuser via `PageObjects.security.login()`) | implicit default | Full cluster + all Kibana features | `spaces_grid.ts`, `create_edit_space.ts`, `copy_saved_objects.ts`, `spaces_selection.ts`, `enter_space.ts` | `loginAsAdmin()` | These tests exercise the full Spaces management UI (create/edit/delete/copy), which requires `spaces: all` — `admin` is the correct minimum built-in, not a downgrade candidate |
| `global_all_role` (`kibana: [{ base: ['all'], spaces: ['*'] }]`) | `spaces_security.ts:29` | Full Kibana access, all spaces | `feature_controls_global_all.spec.ts` | `loginAsAdmin()` | Matches built-in admin; no need for a custom role |
| `default_space_all_role` (`kibana: [{ base: ['all'], spaces: ['default'] }]`) | `spaces_security.ts:98` | Full Kibana access, **default space only** | `feature_controls_default_space_only.spec.ts` | `loginWithCustomRole(...)` — keep custom | This is the crux of the test (space-scoped privilege hides Spaces management even with `base: all`); no built-in role expresses "all privileges but only in one space" |
| `nondefault_space_specific_role` (`kibana: [{ base: ['all'], spaces: ['nondefaultspace'] }]`) | `spaces_security.ts:172` | Full Kibana access, **one non-default space only** | `feature_controls_nondefault_space.spec.ts` | `loginWithCustomRole(...)` — keep custom | Same reasoning as above; validates space-scoping is enforced regardless of which space is scoped |

### Over-privileged tests

None flagged. Every FTR test in this suite that runs as the default (superuser-equivalent) user is doing so because it needs to create/edit/delete spaces and manage saved objects across spaces — this is inherent to testing Spaces management itself, not incidental over-privilege.

### Roles deserving shared helpers (used in ≥3 files)

None — `loginAsAdmin()` is already the shared Scout helper; the two custom roles are each used by exactly one spec, so inline `loginWithCustomRole` definitions are appropriate (following the `CUSTOM_ROLES` pattern already used in `saved_objects_management/test/scout/api/fixtures/custom_roles.ts`).

### Special auth patterns

- `PageObjects.security.forceLogout()` is called before/after nearly every describe block in `spaces_selection.ts`, `spaces_security.ts`, `copy_saved_objects.ts`, `enter_space.ts`, and the a11y suite, specifically to avoid flakiness from stale login state (`spaces_selection.ts:44`: "NOTE: Logout needs to happen before anything else to avoid flaky behavior"). Scout's `browserAuth.loginAs*` fixtures manage session cookies per-test already, so this pattern should not be needed — flag as an FTR smell to resolve rather than port (see §9).

---

## 6. Reusability audit

### FTR services and page objects in use

| FTR name | What it does | Used by (files) | Scout equivalent exists? | Hidden assertions? | Recommended scope |
|----------|-------------|-----------------|-------------------------|-------------------|-------------------|
| `PageObjects.spaceSelector` (`space_selector_page.ts`) | Space card clicks, spaces nav popover, create/edit/delete space form interactions, solution-view select, search-in-popover | all 6 spec files | no | yes — `expectHomePage`/`expectRoute`/`expectSpace` assert internally via `expect(...)`; `expectToFindThatManySpace`/`expectNoSpacesFound`/`expectSearchBoxInSpacesSelector` also assert internally | missing; scope: **plugin-local** (`spaces/test/scout/ui/fixtures/page_objects/`) — extend the existing `SpacesPage` object rather than creating a second one. Split into state-returning methods (e.g. `getCurrentUrl()`, `getSpaceCount()`) with assertions moved to specs |
| `PageObjects.settings` (core `settings_page.ts`) | Navigate to Stack Management, click into Kibana Saved Objects section | `create_edit_space.ts`, `spaces_grid.ts`, `spaces_security.ts` | Scout has no direct 1:1, but `page.gotoApp('management')` + `testSubj` locators cover the same navigation without a dedicated page object | n/a | use `page.gotoApp` directly; no new abstraction needed |
| `PageObjects.security` (core `security_page.ts`) | `login`, `forceLogout`, with `expectSpaceSelector` option | all 6 spec files | yes — `browserAuth.loginAsAdmin/loginAsViewer/loginWithCustomRole` fully replace this; Scout does not need an explicit "expect space selector" step since session-per-test isolation avoids the FTR-era flakiness this option worked around | n/a | use existing Scout fixture |
| `PageObjects.copySavedObjectsToSpace` | Open copy-to-space flyout, set up form, start copy, get summary counts, finish copy | `copy_saved_objects.ts` | **yes** — `CopySavedObjectsToSpaceFlyout` already exists at `src/platform/plugins/shared/saved_objects_management/test/scout/ui/fixtures/page_objects/copy_saved_objects_to_space_flyout.ts` and is already exercised end-to-end in `saved_objects_management`'s `imports.spec.ts` | no (returns counts/state) | **reuse as-is** — but it lives in `saved_objects_management`'s plugin-local `test/scout`, not importable cross-plugin. Recommend either (a) promoting it to a shared Scout package if a second plugin needs it (this migration would be the second consumer), or (b) duplicating the ~110-line page object into `spaces/test/scout/ui/fixtures/page_objects/` if promotion is out of scope for this issue. CONFIRMED: promote to a shared location |
| `getService('spaces')` (API-integration `spaces.ts` service) | Create/delete/get/getAll spaces over the Spaces HTTP API | all 6 spec files | yes — `kbnClient.spaces.create/delete` (worker-scoped API fixture, `getSpacesApiHelper`) already covers create/delete; `setSolutionView`/`resetViewToClassic` also present | no | use existing `kbnClient.spaces` fixture; **gap**: no `get`/`getAll` on the Scout fixture — none of the migrated tests need it, so no action required |
| `getService('sampleData')` | Loads/removes Kibana sample data sets | `spaces_selection.ts` ("Spaces Data" describe) | yes — `sampleData` worker fixture exists in kbn-scout | n/a | moot — this describe block is being dropped (§1) |
| `getService('appsMenu')` | Reads nav-link text list | `spaces_security.ts` | no direct fixture, but equivalent achievable via `page.testSubj` locators on the nav | no | plugin-local helper if needed, or inline locator check — low reuse value (single spec), keep inline |
| `getService('listingTable')` | Generic saved-object listing table search/click | `spaces_selection.ts` ("Spaces Data", being dropped) | n/a (moot) | n/a | n/a |

### EUI components interacted with directly

| Component | Interaction pattern | Files |
|----------|-------------------|-------|
| `EuiColorPicker` | Click swatch anchor (`euiColorPickerAnchor`), type hex value | `space_selector_page.ts` used by `create_edit_space.ts`, a11y suite |
| `EuiSelectable` (spaces search popover) | Type into `input[type="search"]` inside `div[role="dialog"]`, read `li[role="option"]` count | `spaces_selection.ts` |
| `EuiSuperSelect` / custom dropdown (`solutionViewSelect`) | Click to open, click serialized option test-subj (`solutionView{Es,Oblt,Security,Classic}Option`) | `create_edit_space.ts`, `spaces_security.ts` (indirectly via edit page), a11y suite |
| File input (avatar/logo upload) | `PageObjects.common.setFileInputPath(path)` on `image` test-subj trigger | `create_edit_space.ts` |
| `EuiCard` (space cards on selector screen) | Click by `space-card-{id}` test-subj | `spaces_selection.ts`, `enter_space.ts` |

### Brittle locator strategies

| File | Line | Current locator | Target component |
|------|------|----------------|-----------------|
| `space_selector_page.ts` | ~37 | `find.byCssSelector('[data-test-subj="space-card-${spaceId}"] .euiCard__titleAnchor')` | Space card title anchor — no dedicated `data-test-subj` on the anchor itself; needs a CSS-scoped lookup even in Scout unless a `data-test-subj` is added to the anchor in `public/space_selector/` components. CONFIRMED: you made add a specific selector for this. |
| `space_selector_page.ts` | ~78 | `find.byCssSelector('#headerSpacesMenuContent')` | Spaces nav popover container — id-based, no test-subj |
| `space_selector_page.ts` | ~215 | `find.byCssSelector('div[role="dialog"] input[type="search"]')` | Spaces-search input inside the nav popover — role-based, no test-subj |
| `space_selector_page.ts` | ~232 | `find.byCssSelector('div[role="dialog"] li[role="option"]')` | Spaces-search result rows — role-based, no test-subj |
| `space_selector_page.ts` | ~239 | `find.byCssSelector('div[role="dialog"] div[data-test-subj="euiSelectableMessage"]')` | "no spaces found" message — has a test-subj already, just nested in a role selector |
| `space_selector_page.ts` | ~184 (`clickSwitchSpaceButton`)/~192 (`clickOnDeleteSpaceButton`) | `find.byCssSelector('#${spaceName}-actions [data-test-subj=euiCollapsedItemActionsButton]')` | Per-row actions overflow button — id-based container, generic test-subj button |

None of these block the migration — Playwright's `page.locator()` can express the same CSS selectors — but they're candidates for `data-test-subj` hardening if the executor wants to reduce brittleness while porting the page object.

### Page objects with hidden assertions

| FTR helper | Method | Assertion | File:line |
|-----------|--------|-----------|-----------|
| `SpaceSelectorPageObject` | `expectRoute(spaceId, route)` | `expect(url).to.contain(...)` | `space_selector_page.ts:53` |
| `SpaceSelectorPageObject` | `expectSpace(spaceId)` | `expect(url).to.contain/not.contain(...)` | `space_selector_page.ts:66` |
| `SpaceSelectorPageObject` | `expectSearchBoxInSpacesSelector()` | `expect(...).to.be(true)` | `space_selector_page.ts:228` |
| `SpaceSelectorPageObject` | `expectToFindThatManySpace(n)` | `expect(spacesFound.length).to.be(n)` | `space_selector_page.ts:233` |
| `SpaceSelectorPageObject` | `expectNoSpacesFound()` | `expect(...).to.be('no spaces found')` | `space_selector_page.ts:240` |
| `SpaceSelectorPageObject` | `goToSpecificSpace(spaceId)` | `expect(await this.find.existsByCssSelector(...)).to.be(false)` | `space_selector_page.ts:220` |

When porting to the Scout `SpacesPage` object, these should become state-returning methods (`getCurrentUrl()`, `getSpaceSearchResultCount()`, `getSpaceSearchEmptyMessage()`, etc.) with the `expect(...)` calls living in the spec files, per Scout convention (see the existing `SpacesPage` in `ui/fixtures/page_objects/spaces.ts`, which already follows this pattern for its 2 methods).

---

## 7. Server configuration

### FTR server args (full chain)

| Arg | Source config | Category | Notes |
|-----|-------------|----------|-------|
| `path.repo=/tmp/` | `config.base.ts:37` | already in Scout default | not used by any spaces test directly |
| `xpack.security.authc.api_key.enabled=true` | `config.base.ts:37` | already in Scout default | no action needed |
| `--xpack.maps.showMapsInspectorAdapter=true` / `--xpack.maps.preserveDrawingBuffer=true` | `config.base.ts:47-48` | already in Scout default (or irrelevant to Spaces) | no action needed |
| `--xpack.security.encryptionKey=...` / `--xpack.encryptedSavedObjects.encryptionKey=...` | `config.base.ts:49-50` | already in Scout default | no action needed |
| `hideAnnouncements: false` (spaces `config.ts` override of `uiSettings.globalDefaults`) | `apps/spaces/config.ts:20-24` | runtime-settable | This is the **only** spaces-specific config override. It re-enables announcement tours that the base config disables globally. CONFIRMED: we can drop this config override. |

### ES server args

None specific to Spaces.

### Custom server config needed?

Not needed. Use Scout's default servers config for both stateful and serverless — no server args force a custom config set.

---

## 8. Deployment targets

| Proposed spec | Where it should run | Reasoning |
|--------------|--------------------|-----------|
| `spaces_grid.spec.ts` | `tags.deploymentAgnostic` | Spaces grid/details page exists identically everywhere |
| `create_edit_space.spec.ts` | `tags.stateful.classic` initially; expand to `deploymentAgnostic` once solution-view switching is verified on serverless | The "solution view" describe changes side-nav type (`es`/`security`/`classic`) — serverless projects have a fixed solution and may not expose this UI the same way. CONFIRMED: solution views are not available within serverless. (existing `spaces_management.ts` FTR-serverless suite suggests feature visibility differs by project, e.g. `hideAllFeaturesLink` missing) |
| `copy_saved_objects.spec.ts` | `tags.deploymentAgnostic` | Copy-to-space is a core cross-space feature available everywhere |
| `feature_controls_global_all.spec.ts` | `tags.deploymentAgnostic` | `admin`/`global_all` behavior is universal |
| `feature_controls_default_space_only.spec.ts` / `feature_controls_nondefault_space.spec.ts` | `tags.stateful.classic` | Space-scoped custom-role privilege restriction is a stateful-only concept; most serverless projects operate with a single fixed space per project today. CONFIRMED: multi-space is available in all serverless project types EXCEPT for vector-db |
| `spaces_selection_login.spec.ts` / `spaces_selection_search.spec.ts` | `tags.deploymentAgnostic` | Space selector/search-in-popover UI exists in both stateful and (per the already-migrated `spaces_selection_serverless.spec.ts`) serverless |
| `enter_space_navigation.spec.ts` (UI) | `tags.stateful.classic` (uses the Canvas app fixture, which may not exist the same way on all serverless projects) | Canvas is NOT available universally. Need to locate something else to use in its place. |
| `enter_space_routing.spec.ts` (API) | `tags.deploymentAgnostic` | Route redirect/normalization logic is server-side and deployment-agnostic |

### Coverage gaps

- The current FTR suite only runs in stateful CI (`ftr_platform_stateful_configs.yml:299`); the serverless-eligible specs above (`spaces_grid`, `copy_saved_objects`, `feature_controls_global_all`, `spaces_selection_*`, `enter_space_routing`) would be **new** serverless coverage once migrated with `deploymentAgnostic`/expanded tags — call this out as a net-positive coverage expansion in the PR description.

### Cloud portability issues

None found. No hardcoded `localhost` URLs, no local filesystem paths, no single-node cluster assumptions in any of the 6 FTR files.

---

## 9. FTR test smells

| Smell | File | Lines | Description | Context |
|-------|------|-------|------------|---------|
| Hardcoded timeout / sleep | `space_selector_page.ts` | 24, 27, 51, 61, 73, 82, 224 (used by all spec files via the page object) | `common.sleep(1000)`/`common.sleep(10000)` scattered through nearly every page-object method | Almost certainly papering over async rendering races; Scout's auto-waiting locators (`waitFor`, `toBeVisible`) should replace every one of these rather than porting sleeps |
| UI-based setup relying on logout/login flakiness workaround | `spaces_selection.ts`, `spaces_security.ts`, `copy_saved_objects.ts`, `enter_space.ts`, `group1/spaces.ts` | throughout | `forceLogout()` before/after almost every describe, with an explicit comment "Logout needs to happen before anything else to avoid flaky behavior" | Scout's per-test browser context + `browserAuth.loginAs*` should make this unnecessary; do not port the forced-logout pattern, rely on fresh contexts per test instead |
| Retry wrapper | `spaces_grid.ts` | 100-113 | `retry.try(async () => {...})` polling the details header + nav title after a space switch | Port as a Playwright `expect(...).toPass()` or rely on locator auto-waiting on the final assertion instead of manual retry |
| Retry wrapper | `group1/spaces.ts` | 104-107 | `retry.try(async () => { await a11y.testAppSnapshot(); })` around the space-selection-page a11y snapshot | Investigate why the snapshot itself is retried — may indicate the page isn't fully settled; prefer waiting on a concrete locator before snapshotting instead of retrying the whole check |
| Sequential journey as separate `it` blocks | `create_edit_space/create_edit_space.ts` | `describe('edit space')` (2 `it`s: initials, avatar) share the `before`-created space and are logically independent edits but run against the same space instance — not a strict chain, low risk | Keep as-is; each `it` re-navigates and asserts independently, no hidden ordering dependency found |
| Sequential journey / shared mutable state | `group1/spaces.ts` | "Create Space B and Verify" block | `space_b`'s creation, deletion-button click, and confirm-deletion are split across 2 `it`s specifically so the deletion redirect can be snapshotted separately | When folding into the new specs, keep the create→delete flow within a single UI spec/test (not split across a11y-only concerns) so failure isolation doesn't hide a broken create step behind a "delete" test name |
| Onboarding/tour dismissal via config override | `apps/spaces/config.ts:20-24` | `hideAnnouncements: false` | Suite-level override re-enabling tours globally; unclear if any test needs this (see §7) — likely leftover and should not be ported without justification |
| Missing cleanup verification | `enter_space.ts` | `before`/`after` | `after` unloads the canvas archive, deletes `another-space`, and does `cleanStandardList()` — cleanup is present and thorough here, no gap found |
| Brittle CSS selectors | `space_selector_page.ts` | see §6 "Brittle locator strategies" table | Multiple `find.byCssSelector`/role-based lookups without `data-test-subj` | Candidates for hardening; not migration blockers |
| Over-privileged execution | none flagged | — | See §5 — all superuser usage is justified by the feature under test |

---

## 10. Migration batches

### Batch 1: Quick wins

Simple/medium tests, all dependencies exist (either already in kbn-scout or the existing `spaces`/`saved_objects_management` Scout suites), no new abstractions beyond extending the existing `SpacesPage` page object.

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 1 | `ui/tests/spaces_grid.spec.ts` | `spaces_grid.ts` | simple | Extend `SpacesPage` with grid/details methods |
| 2 | `ui/tests/spaces_selection_search.spec.ts` | `spaces_selection.ts` (search-in-popover describe) | simple | Extend `SpacesPage` with search-popover methods |
| 3 | `ui/tests/spaces_selection_login.spec.ts` | `spaces_selection.ts` (login selector + nav menu describes) | medium | Extend `SpacesPage` with card-click/nav-switch methods |

- **Human involvement**: `autopilot`
- **Dependencies**: none
- **Blockers**: none

### Batch 2: Needs new abstractions / decisions

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 4 | `ui/tests/create_edit_space.spec.ts` | `create_edit_space/create_edit_space.ts` | medium | Needs avatar/logo upload support (Playwright `setInputFiles`) and solution-view select methods added to `SpacesPage`; folds in 4 a11y snapshots from `group1/spaces.ts` |
| 5 | `ui/tests/copy_saved_objects.spec.ts` | `copy_saved_objects.ts` | medium | Reuses (or duplicates — see §6 `NEEDS VERIFICATION`) `CopySavedObjectsToSpaceFlyout` page object |
| 6 | `ui/tests/feature_controls_global_all.spec.ts` | `feature_controls/spaces_security.ts` (global_all describe) | simple | Uses `loginAsAdmin()`, no custom role needed |
| 7 | `ui/tests/feature_controls_default_space_only.spec.ts` | `feature_controls/spaces_security.ts` (default-space describe) | medium | New `CUSTOM_ROLES` entry + `loginWithCustomRole` |
| 8 | `ui/tests/feature_controls_nondefault_space.spec.ts` | `feature_controls/spaces_security.ts` (nondefault-space describe) | medium | New `CUSTOM_ROLES` entry + `loginWithCustomRole` |

- **Human involvement**: `guided` — needs a decision on promoting vs duplicating `CopySavedObjectsToSpaceFlyout` (item 5), and confirmation that Playwright file-input upload works cleanly against the `image`/avatar trigger (item 4)
- **Dependencies**: extended `SpacesPage` page object from Batch 1
- **Blockers**: none (decisions only)

### Batch 3: Complex / needs verification

| # | Proposed spec | From FTR file | Complexity | Notes |
|---|--------------|--------------|------------|-------|
| 9 | `api/tests/enter_space_routing.spec.ts` | `enter_space.ts` (5 of 7 `it`s) | complex | CONFIRMED: redirect logic happens server-side |
| 10 | `ui/tests/enter_space_navigation.spec.ts` | `enter_space.ts` (2 of 7 `it`s) | medium | Depends on the Canvas app fixture archive; confirm availability/tags per §8 |

- **Human involvement**: `guided` — the API-vs-UI split for `enter_space` hinges on confirming where the route-normalization logic executes; surface this to the user before implementing
- **Dependencies**: none from other batches
- **Blockers**: `NEEDS VERIFICATION` on server-side vs client-side redirect logic (item 9)

---

## 11. Effort summary

| Metric | Value |
|--------|-------|
| Total FTR test files analyzed | 7 (6 functional + 1 accessibility) |
| > UI tests | 8 new specs (grid, create_edit_space, copy_saved_objects, 3× feature_controls, 2× spaces_selection, enter_space_navigation) |
| > API tests | 1 new spec (enter_space_routing) |
| > Unit tests (RTL/Jest) | 0 |
| > Dropped | 1 (`spaces_selection.ts` "Spaces Data" describe, 2 `it`s) |
| > Deferred | 0 |
| New page objects needed | 0 net-new files; 1 extended (`SpacesPage` gains ~10 methods), 1 reused-or-duplicated (`CopySavedObjectsToSpaceFlyout`) |
| New API services needed | 0 (existing `kbnClient.spaces` fixture covers create/delete/setSolutionView) |
| `data-test-subj` additions to source code | 0 required to unblock migration; up to 5 optional hardening candidates flagged in §6 |
| Custom server config sets | 0 new / reuse Scout default |
| Migration batches | 3 |

### Risks and open questions

- **`NEEDS VERIFICATION`** — `enter_space.ts` route-normalization logic: is it server-side (testable via API) or client-side (must stay UI)? Drives the Batch 3 split (§1 item 8, §10 batch 3).
- **`NEEDS VERIFICATION`** — Promote `CopySavedObjectsToSpaceFlyout` page object to a shared location, or duplicate it into `spaces/test/scout`? This migration is the second consumer (§6).
- **`NEEDS VERIFICATION`** — Does `hideAnnouncements: false` in `apps/spaces/config.ts` matter to any migrated test, or can it be dropped (§7)?
- **`NEEDS VERIFICATION`** — Serverless availability/behavior of: solution-view switching (`create_edit_space.spec.ts`), space-scoped custom-role restrictions (`feature_controls_default_space_only`/`nondefault_space`), and the Canvas app (`enter_space_navigation.spec.ts`) — affects final tag assignment in §8.
- **Decision needed from user**: confirm the "Spaces Data" describe drop in `spaces_selection.ts` is acceptable (§1 Tests to drop) — no coverage is believed lost, but this is a judgment call worth explicit sign-off given it touches sample-data dashboard rendering. CONFIRMED THIS IS OK TO DROP
- **Decision needed from user**: acceptable to add `data-test-subj` attributes to `space_selector_page.ts`-equivalent locators (space-card anchor, spaces-search input/results, nondefault-space actions button) as part of this migration, or defer as follow-up (§6 Brittle locator strategies)? CONFIRMED THIS IS OK TO ADD.
