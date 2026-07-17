/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

  // ---- generic header / selector ----

  async isProjectHeaderVisible() {
    return await this.page.testSubj.isVisible('kibanaProjectHeader');
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
    return this.page.testSubj.locator('spacesNavSelector');
  }

  async openSpacesSelector() {
    await this.page.testSubj.click('spacesNavSelector');
  }

  async isManageButtonVisible() {
    return await this.page.testSubj.isVisible('manageSpaces');
  }

  async waitForManageButton() {
    await this.page.testSubj.locator('manageSpaces').waitFor({ state: 'visible' });
  }

  /** Reads the `title` attribute of the header space selector (current space name). */
  async getCurrentSpaceTitle() {
    return await this.spacesSelectorLocator().getAttribute('title');
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

  async clickCreateSpace() {
    await this.page.testSubj.click('createSpace');
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
    return this.page.testSubj.locator('spaceMenuPopoverPanel');
  }

  async openSpacesNav() {
    await this.openSpacesSelector();
    await this.spacesMenuPanelLocator().waitFor({ state: 'visible' });
  }

  async switchToSpaceFromNav(spaceId: string) {
    await this.page.testSubj.click(`${spaceId}-selectableSpaceItem`);
  }

  navSearchInputLocator() {
    return this.page.testSubj.locator('spacesMenuSearchInput');
  }

  async isNavSearchInputVisible() {
    return await this.navSearchInputLocator().isVisible();
  }

  async searchSpacesInNav(searchText: string) {
    const input = this.navSearchInputLocator();
    await input.fill(searchText);
  }

  /** Counts the selectable space options currently shown in the nav popover. */
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
