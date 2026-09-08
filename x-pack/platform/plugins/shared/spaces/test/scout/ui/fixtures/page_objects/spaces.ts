/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { ScoutPage } from '@kbn/scout';

export type SpaceSolution = 'es' | 'oblt' | 'security' | 'classic';

/**
 * Page object for the Spaces UI: the management grid/details pages, the
 * create/edit space form, the login-time space selector, and the header
 * spaces navigation menu.
 *
 * State-returning methods (`getX`/`isX`/`xLocator`) keep assertions in the
 * specs, per Scout convention.
 */
export class SpacesPage {
  constructor(private readonly page: ScoutPage) {}

  async isProjectHeaderVisible() {
    return await this.page.testSubj.locator('chromeNextGlobalHeader').isVisible();
  }

  async navigateToHome() {
    await this.page.gotoApp('home');
    await this.dismissWelcomeScreen();
    await this.page.testSubj.locator('homeApp').waitFor({
      state: 'visible',
      timeout: 30_000, // home app can be slow to render after navigation + welcome screen dismiss
    });
  }

  async dismissWelcomeScreen() {
    await this.page.evaluate(() => {
      localStorage.setItem('home:welcome:show', 'false');
    });
  }

  spacesSelectorLocator() {
    return this.page.testSubj
      .locator('contextSwitcherTriggerButton')
      .or(this.page.testSubj.locator('spacesNavSelector'));
  }

  async openSpacesSelector() {
    const contextTrigger = this.page.testSubj.locator('contextSwitcherTriggerButton');
    const classicTrigger = this.page.testSubj.locator('spacesNavSelector');
    await contextTrigger.or(classicTrigger).waitFor({ state: 'visible' });

    if (await contextTrigger.isVisible()) {
      await contextTrigger.click();
      await this.page.testSubj.locator('contextSwitcherPopoverPanel').waitFor({ state: 'visible' });
      const spacesRow = this.page.testSubj.locator('contextSwitcherSpacesRow');
      const spacesList = this.page.locator('#contextSwitcherSpacesList');
      await spacesRow.or(spacesList).waitFor({ state: 'visible' });
      if (await spacesRow.isVisible()) {
        await spacesRow.click();
      }
      await spacesList.waitFor({ state: 'visible' });
    } else {
      await classicTrigger.click();
      await this.page.testSubj.locator('spaceMenuPopoverPanel').waitFor({ state: 'visible' });
    }
  }

  async isManageButtonVisible() {
    return await this.page.testSubj.isVisible('manageSpaces');
  }

  async waitForManageButton() {
    await this.page.testSubj.locator('manageSpaces').waitFor({ state: 'visible' });
  }

  async getCurrentSpaceTitle() {
    const contextTrigger = this.page.testSubj.locator('contextSwitcherTriggerButton');
    const classicTrigger = this.page.testSubj.locator('spacesNavSelector');
    await contextTrigger.or(classicTrigger).waitFor({ state: 'visible' });

    if (await contextTrigger.isVisible()) {
      return (await contextTrigger.getAttribute('data-space-name'))?.trim() ?? null;
    }

    // Classic nav exposes the space name only via `title`.
    return (await classicTrigger.getAttribute('title'))?.trim() ?? null;
  }

  getCurrentUrl() {
    return this.page.url();
  }

  // ---- spaces management: grid & details ----

  gridPageLocator() {
    return this.page.testSubj.locator('spaces-grid-page');
  }

  async gotoSpacesGrid() {
    await this.page.gotoApp('management/kibana/spaces');
    await this.page.testSubj.locator('spacesListTableRow-default').waitFor({
      state: 'visible',
    });
  }

  async gotoManagement() {
    await this.page.gotoApp('management');
  }

  /**
   * The Stack Management landing page renders a different root element per
   * deployment: `managementHome` (classic chrome), `managementHomeSolution`
   * (project chrome), or `cards-navigation-page` (when cards navigation is
   * enabled, e.g. serverless). Match any of them so callers stay
   * deployment-agnostic.
   */
  managementLandingLocator() {
    return this.page.locator(
      [
        '[data-test-subj="managementHome"]',
        '[data-test-subj="managementHomeSolution"]',
        '[data-test-subj="cards-navigation-page"]',
      ].join(', ')
    );
  }

  /**
   * The Spaces entry on the management landing renders as a sidebar nav link
   * (`spaces`) with the classic sidebar, or as a navigation card
   * (`app-card-spaces`) when cards navigation is enabled.
   */
  managementSpacesEntryLocator() {
    return this.page.locator(
      ['[data-test-subj="spaces"]', '[data-test-subj="app-card-spaces"]'].join(', ')
    );
  }

  /** Counts the rows currently rendered in the spaces listing table. */
  async getSpaceRowCount() {
    return await this.page.locator('[data-test-subj*="spacesListTableRow-"]').count();
  }

  /**
   * Filters the grid via its search box. Because the grid lists every space in
   * the deployment (including ones created by other specs running in parallel),
   * filtering by a unique prefix keeps row-count assertions deterministic.
   */
  async filterSpacesGrid(searchText: string) {
    const searchBox = this.page.testSubj.locator('spacesListTableSearchBox');
    await searchBox.fill(searchText);
    // Search is incremental (debounced 200ms); Enter forces an immediate apply
    // so callers don't race the debounce before asserting row counts.
    await searchBox.press('Enter');
  }

  spaceRowLocator(spaceId: string) {
    return this.page.testSubj.locator(`spacesListTableRow-${spaceId}`);
  }

  async clickSpaceDetailsLink(spaceId: string) {
    await this.page.testSubj.click(`${spaceId}-hyperlink`);
  }

  detailsHeaderLocator() {
    return this.page.testSubj.locator('space-view-page-details-header');
  }

  async getDetailsHeaderText() {
    await this.detailsHeaderLocator().waitFor({ state: 'visible' });
    return (await this.detailsHeaderLocator().innerText()).toLowerCase();
  }

  switchSpaceButtonLocator() {
    return this.page.testSubj.locator('spaces-view-page-switcher-button');
  }

  async isSwitchSpaceButtonVisible() {
    return await this.page.testSubj.isVisible('spaces-view-page-switcher-button');
  }

  async clickSwitchSpaceButton() {
    await this.switchSpaceButtonLocator().click();
  }

  // ---- spaces management: create / edit form ----

  createPageLocator() {
    return this.page.testSubj.locator('spaces-create-page');
  }

  viewPageLocator() {
    return this.page.testSubj.locator('spaces-view-page');
  }

  async gotoEditSpace(spaceId: string) {
    await this.page.gotoApp(`management/kibana/spaces/edit/${spaceId}`);
    await this.viewPageLocator().waitFor({ state: 'visible' });
  }

  async gotoCreateSpace() {
    await this.page.gotoApp('management/kibana/spaces/create');
    await this.createPageLocator().waitFor({ state: 'visible' });
  }

  async clickCreateSpace() {
    await this.page.testSubj.click('createSpace');
  }

  /** Cross-project search default scope section on create/edit space pages. */
  cpsDefaultScopePanelLocator() {
    return this.page.testSubj.locator('cpsDefaultScopePanel');
  }

  /** The picker's project list (one row per origin/linked project, each with its own include/exclude switch). */
  projectPickerListLocator() {
    return this.page.testSubj.locator('projectPickerList');
  }

  projectPickerListItemLocator() {
    return this.page.testSubj.locator('projectPickerListItem');
  }

  /** The row for the space's own (origin) project — identified by its "This Project" badge, not by id. */
  originProjectListItemLocator() {
    return this.projectPickerListItemLocator().filter({
      has: this.page.testSubj.locator('projectPickerListItemOriginBadge'),
    });
  }

  /** The origin project row's include/exclude switch. */
  originProjectSwitchLocator() {
    return this.originProjectListItemLocator().locator(
      '[data-test-subj^="projectPickerListItemSwitch-"]'
    );
  }

  originProjectContextMenuButtonLocator() {
    return this.originProjectListItemLocator().locator(
      '[data-test-subj^="projectPickerListItemContextMenu-"]'
    );
  }

  /** Footer action that includes every currently visible project; disabled once all are already included. */
  includeAllVisibleButtonLocator() {
    return this.page.testSubj.locator('projectPickerIncludeAllVisibleBtn');
  }

  /** Container listing the active project-tag filter badges; only rendered while filters exist. */
  projectTagFilterDisplayLocator() {
    return this.page.testSubj.locator('projectPickerFilterDisplayContainer');
  }

  /** The remove ("x") icon buttons on the project-tag filter badges. */
  projectTagFilterRemoveButtonLocator() {
    return this.projectTagFilterDisplayLocator().locator(
      '[data-test-subj^="filterBadgeCloseButton-"]'
    );
  }

  projectPickerListLoadingIndicatorLocator() {
    return this.page.testSubj.locator('projectPickerListLoadingIndicator');
  }

  /**
   * Clears any active project-tag filter by removing each filter badge; a no-op when no filter
   * is active. Needed because a space configured with the legacy `_alias:_origin`/`_alias:*`
   * routing strings decodes as a stray project-tag filter (the picker's codec only understands
   * `_id`-based selection), not an excluded-project override, so
   * `includeAllVisibleButtonLocator` alone can't undo it. The space config view renders the
   * picker without its header (and thus without the "Clear project tag filters" global action),
   * so filters are removed badge-by-badge via each badge's remove icon.
   */
  async clearProjectTagFilters() {
    // Each removal kicks off a filter-proposal refetch that temporarily makes the remaining
    // badges non-interactive, so wait out the loading indicator between clicks.
    await this.projectPickerListLoadingIndicatorLocator().waitFor({ state: 'hidden' });
    const removeButtons = await this.projectTagFilterRemoveButtonLocator().all();
    // Click in reverse DOM order so earlier badges keep their index as later ones are removed.
    for (const removeButton of removeButtons.reverse()) {
      await removeButton.click();
      await this.projectPickerListLoadingIndicatorLocator().waitFor({ state: 'hidden' });
    }
  }

  /** Waits until the CPS panel and its project list have loaded. */
  async waitForProjectRoutingPicker() {
    await this.cpsDefaultScopePanelLocator().waitFor({ state: 'visible' });
    await this.projectPickerListLocator().waitFor({ state: 'visible' });
  }

  /**
   * Includes every visible project (the "all projects" routing outcome): clears any active
   * project-tag filter first, then ensures every remaining visible project is included.
   * No-op if already all-included with no filter.
   */
  async selectAllProjectsRouting() {
    await this.clearProjectTagFilters();
    const includeAllButton = this.includeAllVisibleButtonLocator();
    if (await includeAllButton.isEnabled()) {
      await includeAllButton.click();
    }
  }

  /** Excludes every project except the origin project (the "origin-only" routing outcome). */
  async selectOriginProjectRouting() {
    await this.originProjectContextMenuButtonLocator().click();
    await this.page.testSubj.locator('projectPickerIncludeOnlyThisProjectMenuItem').click();
  }

  /**
   * CPS chrome nav project-picker button (visible when CPS is enabled and projects are linked).
   */
  cpsProjectPickerButtonLocator() {
    return this.page.testSubj.locator('cps-project-picker-button');
  }

  async setSpaceName(name: string) {
    await this.page.testSubj.fill('addSpaceName', name);
  }

  async setSpaceInitials(initials: string) {
    await this.page.testSubj.fill('spaceLetterInitial', initials);
  }

  async saveSpace() {
    await this.page.testSubj.click('save-space-button');
  }

  async confirmModal() {
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  /** Opens the solution-view dropdown (idempotent) and selects the given solution. */
  async changeSolutionView(solution: SpaceSolution) {
    const select = this.page.testSubj.locator('solutionViewSelect');
    const classes = (await select.getAttribute('class')) ?? '';
    if (!classes.includes('isOpen')) {
      await select.click();
    }
    const serialized = solution.charAt(0).toUpperCase() + solution.slice(1);
    await this.page.testSubj.click(`solutionView${serialized}Option`);
  }

  async clickColorPicker() {
    await this.page.testSubj.click('euiColorPickerAnchor');
  }

  spaceAvatarLocator(spaceId: string) {
    return this.page.testSubj.locator(`space-avatar-${spaceId}`);
  }

  async getSpaceAvatarText(spaceId: string) {
    return await this.spaceAvatarLocator(spaceId).innerText();
  }

  /** Uploads an avatar image via the hidden file input behind the "image" trigger. */
  async uploadAvatar(filePath: string) {
    await this.page.testSubj.click('image');
    // The file input is rendered alongside the "image" trigger; target it directly.
    await this.page.locator('input[type="file"]').setInputFiles(filePath);
  }

  async toggleFeatureCategoryCheckbox(category: string) {
    await this.page.testSubj.click(`featureCategoryCheckbox_${category}`);
  }

  /** Expands a feature category's accordion to reveal its individual features. */
  async openFeatureCategory(category: string) {
    await this.page.testSubj.click(`featureCategoryButton_${category}`);
  }

  async isFeatureCategoryChecked(category: string) {
    return await this.page.testSubj.isChecked(`featureCategoryCheckbox_${category}`);
  }

  userImpactWarningLocator() {
    return this.page.testSubj.locator('space-edit-page-user-impact-warning');
  }

  /** Confirm modal shown by `useUnsavedChangesPrompt` when leaving a dirty form. */
  navigationBlockConfirmModalLocator() {
    return this.page.testSubj.locator('navigationBlockConfirmModal');
  }

  /** Clicks the Kibana logo in the header, navigating away from the spaces app. */
  async clickLogo() {
    await this.page.testSubj.click('logo');
  }

  // ---- delete-space confirm modal (edit page) ----

  async clickDeleteSpaceOnEditPage() {
    await this.page.testSubj.click('delete-space-button');
  }

  confirmDeleteModalLocator() {
    return this.page.testSubj.locator('confirmModalTitleText');
  }

  async cancelModal() {
    await this.page.testSubj.click('confirmModalCancelButton');
  }

  // ---- login-time space selector ----

  spaceSelectorLocator() {
    return this.page.testSubj.locator('kibanaSpaceSelector');
  }

  async waitForSpaceSelector() {
    await this.spaceSelectorLocator().waitFor({ state: 'visible' });
  }

  spaceCardLocator(spaceId: string) {
    return this.page.testSubj.locator(`space-card-${spaceId}`);
  }

  async clickSpaceCard(spaceId: string) {
    await this.spaceCardLocator(spaceId).click();
  }

  // ---- header spaces navigation menu ----

  spacesMenuPanelLocator() {
    return this.page.testSubj
      .locator('contextSwitcherPopoverPanel')
      .or(this.page.testSubj.locator('spaceMenuPopoverPanel'));
  }

  async openSpacesNav() {
    await this.openSpacesSelector();
    await this.spacesMenuPanelLocator().waitFor({ state: 'visible' });
  }

  /**
   * Selects a space in the nav menu and waits for the resulting navigation to commit.
   *
   * Selecting a space `await`s an analytics flush before it calls `navigateToUrl`
   * (`nav_control/components/spaces_menu.tsx`), so the click resolves long before the
   * browser starts navigating — regularly longer than the default 10s expect timeout on a
   * stack where the telemetry endpoint is unreachable. Settling here rather than in each
   * spec also means callers are never left with an in-flight navigation for a subsequent
   * `page.goto` to collide with.
   */
  async switchToSpaceFromNav(spaceId: string) {
    const landedInSpace = (url: URL) =>
      spaceId === DEFAULT_SPACE_ID
        ? !url.pathname.startsWith('/s/')
        : url.pathname.startsWith(`/s/${spaceId}/`);

    await Promise.all([
      this.page.waitForURL(landedInSpace, { waitUntil: 'commit', timeout: 30_000 }),
      this.page.testSubj
        .locator(`space-${spaceId}`)
        .or(this.page.testSubj.locator(`${spaceId}-selectableSpaceItem`))
        .click(),
    ]);
  }

  navSearchInputLocator() {
    return this.page.testSubj
      .locator('contextSwitcherSpacesSearchInput')
      .or(this.page.testSubj.locator('spacesMenuSearchInput'));
  }

  async isNavSearchInputVisible() {
    return await this.navSearchInputLocator().isVisible();
  }

  async searchSpacesInNav(searchText: string) {
    await this.navSearchInputLocator().fill(searchText);
  }

  async getNavSpaceResultCount() {
    return await this.spacesMenuPanelLocator().locator('li[role="option"]').count();
  }

  async getNavNoResultsMessage() {
    return (
      await this.spacesMenuPanelLocator()
        .locator('[data-test-subj="euiSelectableMessage"]')
        .innerText()
    ).trim();
  }
}
