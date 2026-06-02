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

  /** Navigate back to the Canvas listing via the first breadcrumb link. */
  async goToListingPageViaBreadcrumbs() {
    await this.page.locator('[data-test-subj~="breadcrumb"][data-test-subj~="first"]').click();
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

  /** Search the listing for a workpad by name. */
  async searchForWorkpad(name: string) {
    await this.page.testSubj.locator('tableListSearchBox').fill(name);
  }

  /** Return the current browser URL (for path/workpad-id assertions in the spec). */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
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
   * the "Visualization" action (which launches the Lens editor).
   */
  async addNewLensPanel() {
    await this.addNewPanel('Visualization');
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

  /**
   * Set the Canvas time-filter element's absolute date range.
   *
   * Canvas's `EuiSuperDatePicker` with `width="full"` renders both the start
   * and end date calendars permanently inline (not as popovers), so both month
   * containers are always present in the DOM.  Filtering by month name alone
   * therefore finds two containers, causing strict-mode violations.
   *
   * This method scopes each calendar click to the tabpanel that belongs to the
   * target date section.  Each "Start date: Absolute" / "End date: Absolute"
   * tab carries an `aria-controls` attribute pointing to the id of its own
   * tabpanel, which contains only that section's react-datepicker calendar.
   * Scoping the day locator to that panel guarantees a single match.
   *
   * Date strings must follow the EUI/Scout convention:
   * `'Oct 19, 2020 @ 00:00:00.000'`
   */
  async setTimeFilterRange(from: string, to: string) {
    const parseDateLabel = (dateStr: string): { month: string; day: string } => {
      const match = dateStr.match(/^(\w{3})\s+(\d{1,2}),\s+\d{4}/);
      if (!match) {
        throw new Error(`setTimeFilterRange: cannot parse date string "${dateStr}"`);
      }
      const monthMap: Record<string, string> = {
        Jan: 'January',
        Feb: 'February',
        Mar: 'March',
        Apr: 'April',
        May: 'May',
        Jun: 'June',
        Jul: 'July',
        Aug: 'August',
        Sep: 'September',
        Oct: 'October',
        Nov: 'November',
        Dec: 'December',
      };
      return { month: monthMap[match[1]], day: match[2] };
    };

    const pickDay = async (tabLabel: string, month: string, day: string) => {
      const tab = this.page.getByRole('tab', { name: tabLabel });
      const panelId = await tab.getAttribute('aria-controls');
      if (!panelId) {
        throw new Error(`setTimeFilterRange: tab "${tabLabel}" has no aria-controls`);
      }
      await this.page
        .locator(`#${panelId}`)
        .locator('.react-datepicker__month-container')
        .filter({ hasText: month })
        .locator(`[aria-label="day-${day}"]`)
        .click({ timeout: 20_000 });
    };

    const { month: fromMonth, day: fromDay } = parseDateLabel(from);
    const { month: toMonth, day: toDay } = parseDateLabel(to);

    await pickDay('Start date: Absolute', fromMonth, fromDay);
    await pickDay('End date: Absolute', toMonth, toDay);
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
    const values = await this.page.evaluate((index: number) => {
      const env = (
        window as unknown as {
          MonacoEnvironment: { monaco: { editor: { getModels(): Array<{ getValue(): string }> } } };
        }
      ).MonacoEnvironment;
      return env.monaco.editor.getModels().map((m) => m.getValue());
    }, nthIndex);
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
