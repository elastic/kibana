/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';

export class GraphPage {
  // Public locators consumed directly by specs.
  readonly createGraphPromptButton: Locator;
  readonly saveButton: Locator;
  readonly currentGraphBreadcrumb: Locator;
  readonly vennLargeTerm1: Locator;
  readonly vennLargeTerm2: Locator;
  readonly vennSmallTerm1: Locator;
  readonly vennSmallOverlap: Locator;
  readonly vennSmallTerm2: Locator;

  // Internal locators — consumed only by methods on this class.
  private readonly landingPage: Locator;
  private readonly listingSearchBox: Locator;
  private readonly newButton: Locator;
  private readonly homeBreadcrumb: Locator;
  private readonly datasourceButton: Locator;
  private readonly addFieldButton: Locator;
  private readonly fieldSearchInput: Locator;
  private readonly exploreButton: Locator;
  private readonly queryInput: Locator;
  private readonly selectAllButton: Locator;
  private readonly invertSelectionButton: Locator;
  private readonly removeSelectionButton: Locator;
  private readonly pauseLayoutButton: Locator;
  private readonly resumeLayoutButton: Locator;
  private readonly saveTitleInput: Locator;
  private readonly saveConfirmButton: Locator;
  private readonly saveSuccessToast: Locator;
  private readonly confirmModal: Locator;
  private readonly confirmModalConfirmButton: Locator;
  private readonly nodeCircles: Locator;
  private readonly clickableEdges: Locator;
  private readonly selectionListFields: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.landingPage = this.page.testSubj.locator('graphLandingPage');
    this.createGraphPromptButton = this.page.testSubj.locator('graphCreateGraphPromptButton');
    this.listingSearchBox = this.landingPage.locator('.euiFieldSearch');

    this.newButton = this.page.testSubj.locator('graphNewButton');
    this.saveButton = this.page.testSubj.locator('graphSaveButton');
    // EUI merges the breadcrumb's `data-test-subj` with `breadcrumb first` /
    // `breadcrumb last` into a single space-separated value, and two
    // breadcrumbs register `graphHomeBreadcrumb` (chrome + shared-ux mirror).
    // Match by whole-word + `first` to mirror the FTR selector
    // `'breadcrumb graphHomeBreadcrumb first'`.
    this.homeBreadcrumb = this.page.locator(
      '[data-test-subj~="graphHomeBreadcrumb"][data-test-subj~="first"]'
    );
    this.currentGraphBreadcrumb = this.page.locator(
      '[data-test-subj~="graphCurrentGraphBreadcrumb"]'
    );
    this.datasourceButton = this.page.testSubj.locator('graphDatasourceButton');
    this.addFieldButton = this.page.testSubj.locator('graph-add-field-button');
    this.fieldSearchInput = this.page.testSubj.locator('graph-field-search');
    this.exploreButton = this.page.testSubj.locator('graph-explore-button');
    this.queryInput = this.page.testSubj.locator('queryInput');

    this.selectAllButton = this.page.testSubj.locator('graphSelectAll');
    this.invertSelectionButton = this.page.testSubj.locator('graphInvertSelection');
    this.removeSelectionButton = this.page.testSubj.locator('graphRemoveSelection');
    this.pauseLayoutButton = this.page.testSubj.locator('graphPauseLayout');
    this.resumeLayoutButton = this.page.testSubj.locator('graphResumeLayout');

    this.saveTitleInput = this.page.testSubj.locator('savedObjectTitle');
    this.saveConfirmButton = this.page.testSubj.locator('confirmSaveSavedObjectButton');
    this.saveSuccessToast = this.page.testSubj.locator('saveGraphSuccess');

    this.confirmModal = this.page.testSubj.locator('confirmModalTitleText');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');

    this.nodeCircles = this.page.testSubj.locator('graphNodeCircle');
    this.clickableEdges = this.page.testSubj.locator('graphClickableEdge');
    this.selectionListFields = this.page.locator('[data-test-subj^="graphSelectionListField-"]');

    this.vennLargeTerm1 = this.page.testSubj.locator('graphVennLargeTerm1');
    this.vennLargeTerm2 = this.page.testSubj.locator('graphVennLargeTerm2');
    this.vennSmallTerm1 = this.page.testSubj.locator('graphVennSmallTerm1');
    this.vennSmallOverlap = this.page.testSubj.locator('graphVennSmallOverlap');
    this.vennSmallTerm2 = this.page.testSubj.locator('graphVennSmallTerm2');
  }

  async goto() {
    await this.page.gotoApp('graph');
  }

  async gotoInSpace(spaceId: string) {
    await this.page.goto(this.kbnUrl.app('graph', { space: spaceId }));
  }

  async waitForListing() {
    await this.landingPage.waitFor({ state: 'visible' });
  }

  async clickCreateGraph() {
    await this.createGraphPromptButton.click();
  }

  /**
   * The shell loads as soon as the `Unsaved graph` breadcrumb appears — this
   * is reachable even when the user has no data-view access (the SVG canvas
   * is replaced by a "No data source" panel in that case).
   */
  async waitForWorkspace() {
    await this.currentGraphBreadcrumb.waitFor({ state: 'visible' });
  }

  async pickIndexPattern(indexPattern: string) {
    await this.datasourceButton.click();
    await this.page.testSubj.locator(`savedObjectTitle${indexPattern}`).click();
    // "Add fields" stays `aria-disabled` until the data view's fields finish
    // loading; visibility alone is not enough.
    await this.addFieldButton.waitFor({ state: 'visible' });
    await this.page.waitForFunction(
      () =>
        document
          .querySelector('[data-test-subj="graph-add-field-button"]')
          ?.getAttribute('aria-disabled') === 'false',
      undefined,
      { timeout: 10000 }
    );
  }

  async addFields(fields: string[]) {
    await this.addFieldButton.click();
    await this.fieldSearchInput.waitFor({ state: 'visible' });
    for (const field of fields) {
      await this.fieldSearchInput.fill(field);
      // EuiSelectable list items expose the field name as `title=` — use an
      // attribute selector to avoid races as the filter narrows the list.
      const option = this.page.locator(`.euiSelectableListItem[title="${field}"]`);
      await option.waitFor({ state: 'visible' });
      await option.click();
    }
    await this.fieldSearchInput.fill('');
    await this.addFieldButton.click();
    await this.fieldSearchInput.waitFor({ state: 'hidden' });
  }

  async runQuery(query: string) {
    await this.queryInput.fill(query);
    await this.exploreButton.click();
  }

  async saveWorkspaceAs(title: string) {
    await this.saveButton.click();
    await this.saveTitleInput.fill(title);
    await this.saveConfirmButton.click();
    await this.saveSuccessToast.waitFor({ state: 'visible' });
  }

  async newWorkspace({ discardChanges = false }: { discardChanges?: boolean } = {}) {
    await this.newButton.click();
    if (discardChanges) {
      await this.confirmModal.waitFor({ state: 'visible' });
      await this.confirmModalConfirmButton.click();
    }
  }

  async goToListingViaBreadcrumb() {
    await this.homeBreadcrumb.click();
  }

  async openWorkspace(title: string) {
    await this.page
      .locator(`[data-test-subj="graphListingTitleLink-${title.split(' ').join('-')}"]`)
      .click();
  }

  async deleteWorkspace(title: string) {
    const rowLink = this.page.locator(
      `[data-test-subj^="graphListingTitleLink-${title.split(' ').join('-')}"]`
    );
    await this.listingSearchBox.fill(title);
    await rowLink.waitFor({ state: 'visible' });
    await this.page.testSubj.locator('checkboxSelectAll').click();
    await this.page.testSubj.locator('deleteSelectedItems').click();
    await this.confirmModal.waitFor({ state: 'visible' });
    await this.confirmModalConfirmButton.click();
    await rowLink.waitFor({ state: 'hidden' });
  }

  async nodeCount(): Promise<number> {
    return this.nodeCircles.count();
  }

  async edgeCount(): Promise<number> {
    return this.clickableEdges.count();
  }

  async selectionCount(): Promise<number> {
    return this.selectionListFields.count();
  }

  /**
   * Click the only remaining edge after `isolateEdge`. Dispatches a synthetic
   * SVG click because the overlapping thinner line + SVG `pointer-events`
   * rules make Playwright's actionable click flaky.
   */
  async clickIsolatedEdge() {
    await this.clickableEdges.evaluateAll((els) => {
      if (els[0]) {
        (els[0] as SVGElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
  }

  async stopLayout() {
    if (await this.pauseLayoutButton.isVisible()) {
      await this.pauseLayoutButton.click();
    }
  }

  async startLayout() {
    if (await this.resumeLayoutButton.isVisible()) {
      await this.resumeLayoutButton.click();
    }
  }

  /**
   * Reduce the selection list to exactly `from` and `to` (mirrors the FTR
   * `isolateEdge` flow).
   *
   * Deselecting a node removes its `<SelectedNodeItem>`, so we cannot iterate
   * the list while mutating it (later `.nth(i)` handles go stale). Snapshot
   * all labels first via `evaluateAll`, then click each non-keep target by
   * its own `graph-selected-<label>` selector — fresh resolution every time.
   */
  async isolateEdge(from: string, to: string) {
    await this.selectAllButton.click();

    const PREFIX = 'graphSelectionListField-';
    const allLabels = await this.selectionListFields.evaluateAll(
      (els, prefix) =>
        els
          .map((el) => el.getAttribute('data-test-subj') ?? '')
          .map((subj) => (subj.startsWith(prefix) ? subj.slice(prefix.length) : null))
          .filter((label): label is string => label !== null),
      PREFIX
    );

    const keep = new Set([from, to]);
    for (const label of allLabels) {
      if (keep.has(label)) continue;
      await this.page.locator(`[data-test-subj="graph-selected-${label}"]`).click();
    }

    await this.invertSelectionButton.click();
    await this.removeSelectionButton.click();
  }
}
