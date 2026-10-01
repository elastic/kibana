/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMenu,
  ContentListWrapper,
  type KibanaUrl,
  type Locator,
  type ScoutPage,
} from '@kbn/scout';

const LISTING_TIMEOUT = 20_000;

export class GraphPage {
  /** Shared wrapper for the Content List listing UI (toolbar, table, selection bar). */
  readonly contentList: ContentListWrapper;
  private readonly appMenu: AppMenu;

  // Public locators consumed directly by specs.
  readonly createGraphPromptButton: Locator;
  readonly createGraphButton: Locator;
  readonly saveButton: Locator;
  readonly currentGraphBreadcrumb: Locator;
  readonly vennLargeTerm1: Locator;
  readonly vennLargeTerm2: Locator;
  readonly vennSmallTerm1: Locator;
  readonly vennSmallOverlap: Locator;
  readonly vennSmallTerm2: Locator;
  readonly nodeLabelInput: Locator;
  readonly rawDocumentsDrilldown: Locator;
  readonly inspectorRequestTab: Locator;
  readonly inspectorResponseTab: Locator;
  readonly datasourceButton: Locator;
  readonly queryInput: Locator;

  // Internal locators — consumed only by methods on this class.
  private readonly newButton: Locator;
  private readonly settingsButton: Locator;
  private readonly emptyState: Locator;
  private readonly addFieldButton: Locator;
  private readonly fieldSearchInput: Locator;
  private readonly exploreButton: Locator;
  private readonly selectAllButton: Locator;
  private readonly invertSelectionButton: Locator;
  private readonly removeSelectionButton: Locator;
  private readonly pauseLayoutButton: Locator;
  private readonly resumeLayoutButton: Locator;
  private readonly saveTitleInput: Locator;
  private readonly saveConfirmButton: Locator;
  private readonly saveSuccessToast: Locator;
  private readonly confirmModalTitle: Locator;
  private readonly confirmModalConfirmButton: Locator;
  private readonly nodeCircles: Locator;
  private readonly clickableEdges: Locator;
  private readonly selectionListFields: Locator;
  private readonly graphNodes: Locator;
  private readonly undoButton: Locator;
  private readonly redoButton: Locator;
  private readonly groupButton: Locator;
  private readonly ungroupButton: Locator;
  private readonly mergeLeftIntoRightButton: Locator;
  private readonly expandSelectionButton: Locator;
  private readonly fillConnectionsButton: Locator;
  private readonly blockSelectionButton: Locator;
  private readonly styleSelectionButton: Locator;
  private readonly drilldownButton: Locator;
  private readonly inspectButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.contentList = new ContentListWrapper(page);
    this.appMenu = new AppMenu(page);
    this.createGraphPromptButton = this.page.testSubj.locator('graphCreateGraphPromptButton');
    this.createGraphButton = this.page.testSubj.locator('graphCreateGraphButton');

    this.newButton = this.page.testSubj.locator('graphNewButton');
    this.saveButton = this.page.testSubj.locator('graphSaveButton');
    this.settingsButton = this.page.testSubj.locator('graphSettingsButton');
    this.emptyState = this.page.testSubj.locator('content-list-emptyState');
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

    this.confirmModalTitle = this.page.testSubj.locator('confirmModalTitleText');
    this.confirmModalConfirmButton = this.page.testSubj.locator('confirmModalConfirmButton');

    this.nodeCircles = this.page.testSubj.locator('graphNodeCircle');
    this.clickableEdges = this.page.testSubj.locator('graphClickableEdge');
    this.selectionListFields = this.page.locator('[data-test-subj^="graphSelectionListField-"]');
    this.graphNodes = this.page.testSubj.locator('graphNode');
    this.undoButton = this.page.testSubj.locator('graphUndo');
    this.redoButton = this.page.testSubj.locator('graphRedo');
    this.groupButton = this.page.testSubj.locator('graphGroupSelection');
    this.ungroupButton = this.page.testSubj.locator('graphUngroupSelection');
    this.mergeLeftIntoRightButton = this.page.testSubj.locator('graphMergeLeftIntoRight');
    this.expandSelectionButton = this.page.testSubj.locator('graphExpandSelection');
    this.fillConnectionsButton = this.page.testSubj.locator('graphFillConnections');
    this.blockSelectionButton = this.page.testSubj.locator('graphBlockSelection');
    this.styleSelectionButton = this.page.testSubj.locator('graphStyleSelection');
    this.drilldownButton = this.page.testSubj.locator('graphDrilldown');
    this.inspectButton = this.page.testSubj.locator('graphInspectButton');
    this.nodeLabelInput = this.page.testSubj.locator('graphNodeLabelInput');
    this.rawDocumentsDrilldown = this.page.testSubj.locator('graphRawDocumentsDrilldown');
    this.inspectorRequestTab = this.page.getByRole('tab', { name: 'Request', exact: true });
    this.inspectorResponseTab = this.page.getByRole('tab', { name: 'Response', exact: true });

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
    // Empty prompt button lives inside `content-list-emptyState`; do not `.or()`
    // both or Playwright strict mode fails when the empty listing is ready.
    await this.emptyState
      .or(this.contentList.searchBox)
      .waitFor({ state: 'visible', timeout: LISTING_TIMEOUT });
  }

  async clickCreateGraph() {
    if (await this.createGraphPromptButton.isVisible()) {
      await this.createGraphPromptButton.click();
      return;
    }
    await this.appMenu.clickItem(this.createGraphButton);
  }

  /**
   * Wait for the workspace shell. The `Unsaved graph` breadcrumb appears
   * even without data-view access (the canvas is then replaced by a
   * "No data source" panel), so this is safe for read-only/security tests.
   */
  async waitForWorkspace() {
    await this.currentGraphBreadcrumb.waitFor({ state: 'visible' });
  }

  async pickIndexPattern(indexPattern: string) {
    await this.datasourceButton.click();
    await this.page.testSubj.locator(`savedObjectTitle${indexPattern}`).click();
    // "Add fields" stays `aria-disabled` until the fields finish loading.
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

  async pickIndexPatternByName(dataViewName: string) {
    await this.datasourceButton.click();
    await this.page
      .getByRole('dialog', { name: 'Select a data source' })
      .getByRole('button', { name: dataViewName, exact: true })
      .click();
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

  async changeIndexPatternByName(dataViewName: string) {
    await this.datasourceButton.click();
    await this.confirmModalConfirmButton.click();
    await this.page
      .getByRole('dialog', { name: 'Select a data source' })
      .getByRole('button', { name: dataViewName, exact: true })
      .click();
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
      const option = this.page.testSubj.locator(`graph-field-option-${field}`);
      await option.waitFor({ state: 'visible' });
      await option.click();
    }
    await this.fieldSearchInput.fill('');
    await this.addFieldButton.click();
    await this.fieldSearchInput.waitFor({ state: 'hidden' });
  }

  async runQuery(query: string) {
    await this.queryInput.clear();
    await this.queryInput.pressSequentially(query);
    await this.exploreButton.click();
  }

  async createWorkspaceWithQuery({
    dataViewTitle,
    dataViewName,
    fields,
    query,
  }: {
    dataViewTitle: string;
    dataViewName?: string;
    fields: string[];
    query: string;
  }) {
    await this.goto();
    await this.waitForListing();
    await this.clickCreateGraph();
    await this.waitForWorkspace();
    if (dataViewName) {
      await this.pickIndexPatternByName(dataViewName);
    } else {
      await this.pickIndexPattern(dataViewTitle);
    }
    await this.addFields(fields);
    await this.runQuery(query);
    await this.page.waitForFunction(
      () => document.querySelectorAll('[data-test-subj="graphNodeCircle"]').length > 0
    );
  }

  node(label: string): Locator {
    return this.graphNodes.filter({ has: this.page.getByText(label, { exact: true }) });
  }

  /** Select nodes through the stable sidebar instead of moving D3 geometry. */
  async selectNodes(labels: string[]) {
    await this.selectAllButton.click();

    const PREFIX = 'graphSelectionListField-';
    const selectedLabels = await this.selectionListFields.evaluateAll(
      (elements, prefix) =>
        elements
          .map((element) => element.getAttribute('data-test-subj') ?? '')
          .map((testSubject) =>
            testSubject.startsWith(prefix) ? testSubject.slice(prefix.length) : null
          )
          .filter((label): label is string => label !== null),
      PREFIX
    );

    const labelsToKeep = new Set(labels);
    for (const selectedLabel of selectedLabels) {
      if (!labelsToKeep.has(selectedLabel)) {
        await this.page.locator(`[data-test-subj="graph-selected-${selectedLabel}"]`).click();
      }
    }

    const focusedLabel = labels[labels.length - 1];
    if (focusedLabel) {
      await this.page.testSubj
        .locator(`graphSelectionListField-${focusedLabel}`)
        .getByText(focusedLabel, { exact: true })
        .click();
    }
  }

  async selectAllNodes() {
    await this.selectAllButton.click();
  }

  async groupSelection() {
    await this.groupButton.click();
  }

  async ungroupSelection() {
    await this.ungroupButton.click();
  }

  async mergeLeftIntoRight() {
    await this.mergeLeftIntoRightButton.click();
  }

  async undo() {
    await this.undoButton.click();
  }

  async redo() {
    await this.redoButton.click();
  }

  async expandSelection() {
    await this.expandSelectionButton.click();
  }

  async fillConnections() {
    await this.fillConnectionsButton.click();
  }

  async blockSelection() {
    await this.blockSelectionButton.click();
  }

  async setNodeLabel(label: string) {
    await this.nodeLabelInput.fill(label);
    await this.nodeLabelInput.press('Tab');
  }

  async selectNodeColor(color: string) {
    await this.styleSelectionButton.click();
    await this.page.testSubj.locator(`graphColorPicker-${color}`).click();
  }

  async openInspector() {
    await this.appMenu.clickItem(this.inspectButton);
  }

  async openDrilldowns() {
    await this.drilldownButton.click();
  }

  async saveWorkspace() {
    await this.appMenu.clickItem(this.saveButton);
    await this.saveConfirmButton.click();
    await this.saveSuccessToast.waitFor({ state: 'visible' });
  }

  async openHiddenList() {
    await this.clickSettings();
    await this.page.testSubj.locator('blocklist').click();
  }

  async unblockAllNodes() {
    await this.page.testSubj.locator('graphUnblocklistAll').click();
  }

  async saveWorkspaceAs(title: string) {
    await this.appMenu.clickItem(this.saveButton);
    await this.saveTitleInput.fill(title);
    await this.saveConfirmButton.click();
    await this.saveSuccessToast.waitFor({ state: 'visible' });
  }

  async clickSettings() {
    await this.appMenu.clickItem(this.settingsButton);
  }

  async newWorkspace({ discardChanges = false }: { discardChanges?: boolean } = {}) {
    await this.appMenu.clickItem(this.newButton);
    if (discardChanges) {
      await this.confirmModalTitle.waitFor({ state: 'visible' });
      await this.confirmModalConfirmButton.click();
    }
  }

  async goToListingViaBreadcrumb() {
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await this.goto();
  }

  async openWorkspace(title: string) {
    await this.workspaceListingLink(title).click();
  }

  async deleteWorkspace(title: string) {
    const rowLink = this.workspaceListingLink(title);
    await this.contentList.searchFor(title);
    await rowLink.waitFor({ state: 'visible' });
    await this.contentList.selectAllAndDelete();
    await rowLink.waitFor({ state: 'hidden' });
  }

  private workspaceListingLink(title: string): Locator {
    return this.contentList.itemLinks.filter({ hasText: title });
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
   * SVG click — overlapping thin lines and SVG `pointer-events` make
   * Playwright's actionable click flaky here.
   */
  async clickIsolatedEdge() {
    await this.clickableEdges.evaluateAll((els) => {
      if (els.length !== 1) {
        throw new Error(`Expected exactly one isolated edge, found ${els.length}`);
      }
      (els[0] as SVGElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
   * Reduce the selection list to exactly `from` and `to`.
   *
   * Deselecting a node removes its `<SelectedNodeItem>`, so snapshot labels
   * first; click each non-keep node via its own `graph-selected-<label>`
   * selector to avoid stale list-index handles.
   */
  async isolateEdge(from: string, to: string) {
    await this.selectNodes([from, to]);
    await this.invertSelectionButton.click();
    await this.removeSelectionButton.click();
  }
}
