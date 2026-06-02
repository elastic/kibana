/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';

/**
 * Canvas page object for Scout UI tests.
 *
 * Following Scout best practices:
 * - Methods return state or locators; they do NOT assert.
 * - Assertions live in the spec files.
 * - UI interactions and selectors are centralized here.
 */
export class CanvasPage {
  // ── Workpad listing ────────────────────────────────────────────────────────

  /** Rows in the workpad listing table. */
  public readonly workpadListItems: Locator;

  /** The "Create workpad" button in the listing. */
  public readonly createWorkpadButton: Locator;

  // ── Open workpad ───────────────────────────────────────────────────────────

  /** The workpad page container (present once a workpad is open). */
  public readonly workpadPage: Locator;

  /** Individual element content containers on the workpad page. */
  public readonly workpadPageElements: Locator;

  /** The "Add element" button visible on a workpad (editor only). */
  public readonly addElementButton: Locator;

  /** The canvas refresh control (present when a workpad is open). */
  public readonly refreshControl: Locator;

  // ── Saved elements modal ───────────────────────────────────────────────────

  /** The saved elements modal dialog. */
  public readonly savedElementsModal: Locator;

  /** Cards in the saved elements modal. */
  public readonly elementCards: Locator;

  /** Toast shown on successful custom element creation. */
  public readonly customElementCreateSuccessToast: Locator;

  // ── Embeddables ────────────────────────────────────────────────────────────

  /** All embeddable panel containers on the workpad. */
  public readonly embeddablePanels: Locator;

  // ── Feature controls ───────────────────────────────────────────────────────

  /**
   * The "headerBadge" shown for read-only users.
   * Use `expect(canvas.headerBadge).toBeVisible()` to assert the badge is present.
   * Use `expect(canvas.headerBadge).toHaveAttribute('data-test-badge-label', /read only/i)`
   * to assert the badge label.
   */
  public readonly headerBadge: Locator;

  // ── Share menu ─────────────────────────────────────────────────────────────

  /** The workpad header "Share" button. */
  public readonly shareButton: Locator;

  /** The "PDF reports" item inside the share menu. */
  public readonly pdfReportsShareItem: Locator;

  /** The "Generate" button inside the PDF reports share panel. */
  public readonly generateReportButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.workpadListItems = this.page.testSubj.locator(
      'canvasWorkpadTable > canvasWorkpadTableWorkpad'
    );
    this.createWorkpadButton = this.page.testSubj.locator('create-workpad-button');
    this.workpadPage = this.page.testSubj.locator('canvasWorkpadPage');
    this.workpadPageElements = this.page.testSubj.locator(
      'canvasWorkpadPage > canvasWorkpadPageElementContent'
    );
    this.addElementButton = this.page.testSubj.locator('add-element-button');
    this.refreshControl = this.page.testSubj.locator('canvas-refresh-control');
    this.savedElementsModal = this.page.testSubj.locator('saved-elements-modal');
    this.elementCards = this.page.locator('.canvasElementCard__wrapper');
    this.customElementCreateSuccessToast = this.page.testSubj.locator(
      'canvasCustomElementCreate-success'
    );
    this.embeddablePanels = this.page.testSubj.locator('embeddablePanel');
    this.headerBadge = this.page.testSubj.locator('headerBadge');
    this.shareButton = this.page.testSubj.locator('shareTopNavButton');
    this.pdfReportsShareItem = this.page.testSubj.locator('sharePanel-PDFReports');
    this.generateReportButton = this.page.testSubj.locator('generateReportButton');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  /** Navigate to the Canvas workpad listing page (default space). */
  async gotoListing() {
    await this.page.gotoApp('canvas');
  }

  /** Navigate to the Canvas app in a specific space. */
  async gotoInSpace(spaceId: string) {
    await this.page.goto(this.kbnUrl.app('canvas', { space: spaceId }));
  }

  /**
   * Navigate to a specific workpad by ID in the default space.
   * Constructs the URL as /app/canvas/workpad/<id>/page/<pageNum>.
   */
  async gotoWorkpad(workpadId: string, pageNum: number = 1) {
    await this.page.goto(`${this.kbnUrl.app('canvas')}/workpad/${workpadId}/page/${pageNum}`);
  }

  /**
   * Navigate to a specific workpad by ID in a specific space.
   * Constructs the URL as /s/<space>/app/canvas/workpad/<id>/page/1.
   */
  async gotoWorkpadInSpace(workpadId: string, spaceId: string, page: number = 1) {
    await this.page.goto(
      `${this.kbnUrl.app('canvas', { space: spaceId })}/workpad/${workpadId}/page/${page}`
    );
  }

  // ── Workpad listing interactions ────────────────────────────────────────────

  /**
   * Click the workpad list item that matches the given name.
   * The spec should first assert there is exactly one matching item.
   */
  async openWorkpadByName(name: string) {
    await this.page.testSubj
      .locator('canvasWorkpadTable > canvasWorkpadTableWorkpad')
      .filter({ hasText: name })
      .click();
  }

  /**
   * Click the sole workpad entry in the listing (use only when the test
   * has verified `workpadListItems` has exactly 1 row).
   */
  async openSoleWorkpad() {
    await this.workpadListItems.click();
  }

  // ── Workpad editing ────────────────────────────────────────────────────────

  /** Click the "Create workpad" button to create a new workpad. */
  async createNewWorkpad() {
    await this.createWorkpadButton.click();
  }

  /**
   * Set the workpad name via the inline text field.
   * The spec should assert the breadcrumb text separately:
   *   await expect(page.locator('[data-test-subj~="breadcrumb"][data-test-subj~="last"]'))
   *     .toHaveText(name);
   */
  async setWorkpadName(name: string) {
    await this.page.testSubj.locator('canvas-workpad-name-text-field').fill(name);
  }

  // ── Expression editor ──────────────────────────────────────────────────────

  /** Open the full-screen expression editor. */
  async openExpressionEditor() {
    await this.page.testSubj.locator('canvasExpressionEditorButton').click();
  }

  // ── Datasource ─────────────────────────────────────────────────────────────

  /** Open the "Add element" → "Chart" → "Data table" menu to create a datatable. */
  async createNewDatatableElement() {
    await this.addElementButton.click();
    await this.page.testSubj.locator('canvasAddElementMenu__Chart').click();
    await this.page.testSubj.locator('canvasAddElementMenu__table').click();
  }

  /** Open the Data / datasource sidebar tab. */
  async openDatasourceTab() {
    await this.page.testSubj.locator('canvasSidebarDataTab').click();
  }

  /**
   * Change the active datasource type.
   * @param datasourceName e.g. 'esdocs'
   */
  async changeDatasourceTo(datasourceName: string) {
    await this.page.testSubj.locator('canvasChangeDatasourceButton').click();
    await this.page.testSubj.locator(`canvasDatasourceCard__${datasourceName}`).click();
  }

  /** Save the current datasource configuration. */
  async saveDatasourceChanges() {
    await this.page.testSubj.locator('canvasSaveDatasourceButton').click();
  }

  // ── Saved elements (custom elements) modal ─────────────────────────────────

  /** Open the saved elements modal from the "Add element" menu. */
  async openSavedElementsModal() {
    await this.addElementButton.click();
    const menuOption = this.page.testSubj.locator('saved-elements-menu-option');
    await menuOption.waitFor({ state: 'visible' });
    await menuOption.click();
    await this.savedElementsModal.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** Close the saved elements modal. */
  async closeSavedElementsModal() {
    await this.page.testSubj.locator('saved-elements-modal-close-button').click();
    await this.savedElementsModal.waitFor({ state: 'hidden' });
  }

  /**
   * Fill out the custom element form and submit it.
   * Use `clearWithKeyboard` behaviour: fill replaces the existing value.
   */
  async fillOutCustomElementForm(name: string, description: string) {
    await this.page.testSubj.locator('canvasCustomElementForm-name').fill(name);
    await this.page.testSubj.locator('canvasCustomElementForm-description').fill(description);
    await this.page.testSubj.locator('canvasCustomElementForm-submit').click();
  }

  // ── Embeddables ────────────────────────────────────────────────────────────

  /** Return the current number of embeddable panels on the workpad page. */
  async getEmbeddableCount(): Promise<number> {
    return this.embeddablePanels.count();
  }

  /**
   * Add a new Lens panel by opening the editor menu and clicking
   * the "Lens" action (which launches the Lens editor).
   */
  async addNewLensPanel() {
    await this.addNewPanel('Lens');
  }

  /**
   * Add a new panel of the given type via the canvas editor menu.
   * @param actionName e.g. 'Visualization', 'Maps', 'Vega'
   */
  async addNewPanel(actionName: string) {
    await this.page.testSubj.locator('canvasEditorMenuButton').click();
    await this.page.testSubj.locator(`create-action-${actionName}`).click();
  }

  /** Click "Add from library" to open the dashboard add-panel flyout. */
  async clickAddFromLibrary() {
    await this.page.testSubj.locator('canvas-add-from-library-button').click();
    await this.page.testSubj.locator('dashboardAddPanel').waitFor({ state: 'visible' });
  }

  /** Close the "Add from library" flyout and wait for it to disappear. */
  async closeAddFromLibrary() {
    await this.page.testSubj.locator('euiFlyoutCloseButton').click();
    await this.page.testSubj.locator('dashboardAddPanel').waitFor({ state: 'hidden' });
  }

  /**
   * Add an existing saved object to the workpad via the "Add from library" flyout.
   * Mirrors the FTR `dashboardAddPanel.addEmbeddable` finder flow: open the flyout,
   * filter by an optional type + quoted name, click the matching row, then close.
   *
   * @param name dashed finder name (e.g. `'Rendering-Test:-saved-search'`)
   * @param type optional saved-object type filter (e.g. `'search'`, `'lens'`, `'Visualization'`)
   */
  async addEmbeddableFromLibrary(name: string, type?: string) {
    await this.clickAddFromLibrary();
    const typePrefix = type ? `type:(${type}) ` : '';
    const query = `${typePrefix}"${name.replace('-', ' ')}"`;
    const search = this.page.testSubj.locator('savedObjectFinderSearchInput');
    await search.click();
    await search.clear();
    // The finder's debounced search reacts to real keyboard events; `fill()` sets
    // the value without firing them, so the list stays unfiltered. Type natively.
    await search.pressSequentially(query, { delay: 50 });
    await this.page.testSubj
      .locator('savedObjectFinderLoadingIndicator')
      .waitFor({ state: 'hidden', timeout: 30_000 })
      .catch(() => {});
    await this.page.testSubj
      .locator(`savedObjectTitle${name.split(' ').join('-')}`)
      .click({ timeout: 20_000 });
    await this.closeAddFromLibrary();
  }

  /** Locator for an embeddable panel heading on the workpad by its space-stripped title id. */
  embeddablePanelHeading(titleId: string): Locator {
    return this.page.testSubj.locator(`embeddablePanelHeading-${titleId}`);
  }

  /**
   * Hover-actions wrapper for an embeddable panel — by title, or the first panel
   * when no title is given. Mirrors the FTR `getPanelWrapper` selector strategy.
   */
  private panelHoverActions(title?: string): Locator {
    if (!title) {
      // eslint-disable-next-line playwright/no-nth-methods
      return this.page.locator('.embPanel__hoverActionsAnchor').first();
    }
    return this.page.testSubj.locator(`embeddablePanelHoverActions-${title.replace(/\s/g, '')}`);
  }

  /** Open the context menu for an embeddable panel. */
  async openPanelContextMenu(title?: string) {
    const wrapper = this.panelHoverActions(title);
    await wrapper.scrollIntoViewIfNeeded();
    await wrapper.hover();
    const contextMenuOpen = this.page.testSubj.locator('embeddablePanelContextMenuOpen');
    if (await contextMenuOpen.isVisible()) {
      return;
    }
    await wrapper.locator('[data-test-subj="embeddablePanelToggleMenuIcon"]').click();
    await contextMenuOpen.waitFor({ state: 'visible' });
  }

  /**
   * Click a panel action, preferring the hover action if it is present and
   * falling back to the context menu otherwise (mirrors FTR `clickPanelAction`).
   */
  async clickPanelAction(actionTestSubj: string, title?: string) {
    const wrapper = this.panelHoverActions(title);
    await wrapper.scrollIntoViewIfNeeded();
    await wrapper.hover();
    const actionInWrapper = wrapper.locator(`[data-test-subj="${actionTestSubj}"]`);
    if (await actionInWrapper.isVisible()) {
      await actionInWrapper.click();
      return;
    }
    await this.openPanelContextMenu(title);
    await this.page.testSubj.locator(actionTestSubj).click();
  }

  /** Click the "Edit" panel action to open the embeddable's editor (inline or full). */
  async editPanel(title?: string) {
    await this.clickPanelAction('embeddablePanelAction-editPanel', title);
  }

  /** Within a saved-search inline-edit flyout, click "Edit in Discover". */
  async clickEditInDiscover() {
    await this.page.testSubj
      .locator('discoverEmbeddableInlineEditEditInDiscoverLink')
      .click({ timeout: 20_000 });
  }

  /** Click "Save and return" in the Lens editor and wait for Canvas to take over again. */
  async saveLensAndReturn() {
    await this.page.testSubj.locator('lnsApp_saveAndReturnButton').click();
    await this.page.testSubj.locator('lnsApp').waitFor({ state: 'hidden' });
  }

  /** Click "Save and return" in the Visualize editor and wait for Canvas to take over again. */
  async saveVisualizeAndReturn() {
    const saveAndReturn = this.page.testSubj.locator('visualizesaveAndReturnButton');
    await saveAndReturn.click({ timeout: 20_000 });
    await saveAndReturn.waitFor({ state: 'hidden' });
  }

  /** Delete the currently selected element via the workpad edit menu. */
  async deleteSelectedElement() {
    await this.page.testSubj.locator('canvasWorkpadEditMenuButton').click();
    await this.page.testSubj.locator('canvasEditMenuDeleteButton').click();
  }

  // ── Page management ────────────────────────────────────────────────────────

  /** Add a new page to the workpad via the page manager. */
  async addNewPage() {
    const addPageButton = this.page.testSubj.locator('canvasAddPageButton');
    if (!(await addPageButton.isVisible())) {
      await this.page.testSubj.locator('canvasPageManagerButton').click();
    }
    await addPageButton.click();
    await this.page.testSubj.locator('canvasPageManagerButton').click();
  }

  /** Navigate to the previous workpad page. */
  async goToPreviousPage() {
    await this.page.testSubj.locator('previousPageButton').click();
  }

  // ── Share menu ─────────────────────────────────────────────────────────────

  /** Open the workpad header "Share" menu. */
  async openShareMenu() {
    await this.shareButton.click();
  }

  /** Open the "PDF reports" panel within the share menu. */
  async openPdfReportsPanel() {
    await this.pdfReportsShareItem.click();
  }

  // ── Debug / filter helpers ─────────────────────────────────────────────────

  /**
   * Read and parse the filter objects displayed in the canvas debug panel.
   * Returns only filters of the given type ('range' or 'term').
   *
   * No assertion is made here; the spec should assert on the returned value.
   */
  async getDebugFilters(type: 'range' | 'term'): Promise<any[]> {
    const contentElem = this.page.testSubj.locator('canvasDebug__content');
    await contentElem.waitFor({ state: 'visible' });
    const content = await contentElem.innerText();
    const parsed = JSON.parse(content) as { filters: Array<{ query: Record<string, unknown> }> };
    return parsed.filters.filter((f) => f.query[type]);
  }

  // ── Monaco editor helpers ──────────────────────────────────────────────────

  /**
   * Wait for a Monaco editor container to be enabled (textarea is editable).
   * @param containerTestSubjId data-test-subj of the container wrapping the Monaco editor
   */
  async waitForCodeEditorReady(containerTestSubjId: string) {
    const textarea = this.page.testSubj.locator(containerTestSubjId).locator('textarea');
    await textarea.waitFor({ state: 'visible' });
    await textarea.waitFor({ state: 'attached' });
  }

  /**
   * Return the current value of the Monaco model at the given index.
   * Uses `window.MonacoEnvironment.monaco.editor.getModels()` — the same
   * approach as the FTR `monacoEditor` service.
   */
  async getCodeEditorValue(nthIndex: number = 0): Promise<string> {
    const values = await this.page.evaluate(() => {
      const env = (
        window as unknown as {
          MonacoEnvironment: { monaco: { editor: { getModels(): Array<{ getValue(): string }> } } };
        }
      ).MonacoEnvironment;
      return env.monaco.editor.getModels().map((m) => m.getValue());
    });
    return (values as string[])[nthIndex] ?? '';
  }

  /**
   * Set the value of the Monaco model at the given index.
   * When `nthIndex` is undefined, updates all models.
   */
  async setCodeEditorValue(value: string, nthIndex?: number) {
    await this.page.evaluate(
      ({ index, val }: { index: number | undefined; val: string }) => {
        const env = (
          window as unknown as {
            MonacoEnvironment: {
              monaco: { editor: { getModels(): Array<{ setValue(v: string): void }> } };
            };
          }
        ).MonacoEnvironment;
        const models = env.monaco.editor.getModels();
        if (index !== undefined && models[index]) {
          models[index].setValue(val);
        } else {
          models.forEach((m) => m.setValue(val));
        }
      },
      { index: nthIndex, val: value }
    );
  }
}
