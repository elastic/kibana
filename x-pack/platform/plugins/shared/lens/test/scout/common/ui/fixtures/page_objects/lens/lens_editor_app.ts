/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DebugState } from '@elastic/charts';
import { createLazyPageObject, LensApp, type ScoutPage } from '@kbn/scout';
import { LensDimensions } from './lens_dimensions';
import {
  normalizeComputedColor,
  parseInlineStyle,
  WAIT_FOR_FUNCTION_TIMEOUT_MS,
} from './lens_editor_helpers';
import { LensLayers } from './lens_layers';
import { LensStyle } from './lens_style';

/**
 * Lens plugin Scout page object. Extends shared `@kbn/scout` `LensApp` and composes
 * editor-only domains as nested children (e.g. `pageObjects.lens.layers`).
 *
 * Domain modules are extracted in batches; methods not yet moved remain on this class.
 */
export class LensEditorApp extends LensApp {
  /** Layer tabs, per-layer data-view switch, add/remove. */
  public readonly layers: LensLayers;
  /** Dimension triggers, format params, quick-functions / static-value tabs. */
  public readonly dimensions: LensDimensions;
  /** Style flyout, palette, gauge/heatmap, reference lines, annotations. */
  public readonly style: LensStyle;

  constructor(page: ScoutPage) {
    super(page);
    this.layers = createLazyPageObject(LensLayers, page);
    this.dimensions = createLazyPageObject(LensDimensions, page, {
      closeDimensionEditorButton: this.closeDimensionEditorButton,
      closeDimensionEditor: () => this.closeDimensionEditor(),
    });
    this.style = createLazyPageObject(LensStyle, page);
  }

  // ---------------------------------------------------------------------------
  // Metric — Elastic Charts metric tiles + legacy metric
  // ---------------------------------------------------------------------------

  // Elastic Charts pads the last grid row with empty filler cells (`role="presentation"`,
  // no title/value) to keep tile sizing consistent; excluded since they aren't real metrics.
  // Scope Elastic Charts class selectors to the metric workspace so chrome/other
  // panels with the same classes can't produce false positives.
  readonly metricTilesLocator = this.page.locator(
    '[data-test-subj="mtrVis"] .echChart li:not([role="presentation"])'
  );
  readonly secondaryMetricBadge = this.page.locator('[data-test-subj="mtrVis"] .echBadge__content');
  private readonly secondaryMetricLabel = this.page.locator(
    '[data-test-subj="mtrVis"] .echSecondaryMetric__label'
  );
  /**
   * Added in a render pass after the one `waitForVisualization` settles on — callers that need
   * to assert it appears should poll `count()` before snapshotting via `getMetricVisualizationData`.
   */
  readonly metricProgressBar = this.page.locator(
    '[data-test-subj="mtrVis"] .echSingleMetricProgress'
  );
  readonly legacyMetricValue = this.page.testSubj.locator('metric_value');

  /** Returns locators for each Elastic Charts metric tile currently rendered. */
  getMetricTiles() {
    return this.metricTilesLocator.all();
  }

  /**
   * Clicks the metric tile whose title matches exactly (e.g. to trigger a click-to-filter
   * action). Throws if no tile has that title.
   */
  async clickMetricTileByTitle(title: string) {
    const data = await this.getMetricVisualizationData();
    const index = data.findIndex((datum) => datum.title === title);
    if (index === -1) {
      throw new Error(`Metric tile with title "${title}" not found`);
    }
    const tiles = await this.getMetricTiles();
    await tiles[index].click();
  }

  /** Reads the current state of every metric tile inside `[data-test-subj="mtrVis"]`. */
  async getMetricVisualizationData() {
    const tiles = await this.getMetricTiles();
    const showingBar = (await this.metricProgressBar.count()) > 0;

    const data = [];
    for (const tile of tiles) {
      const getText = async (selector: string) => {
        const el = tile.locator(selector);
        if ((await el.count()) === 0) return undefined;
        return el.evaluate((node) => (node as HTMLElement).innerText);
      };
      const getColor = async (selector: string) => {
        const el = tile.locator(selector);
        if ((await el.count()) === 0) return undefined;
        const color = await el.evaluate((node) => getComputedStyle(node).backgroundColor);
        return normalizeComputedColor(color);
      };

      data.push({
        title: await getText('h2'),
        subtitle: await getText('.echMetricText__subtitle'),
        extraText: await getText('.echMetricText__extraBlock'),
        value: await getText('.echMetricText__valueBlock'),
        color: await getColor('.echMetric'),
        trendlineColor: await (async () => {
          const el = tile.locator('.echSingleMetricSparkline__svg > rect');
          if ((await el.count()) === 0) return undefined;
          return (await el.getAttribute('fill')) ?? undefined;
        })(),
        showingTrendline: (await tile.locator('.echSingleMetricSparkline').count()) > 0,
        showingBar,
      });
    }

    return data;
  }

  /** Returns the visible text of the secondary-value trend badge, or `undefined` if absent. */
  async getSecondaryMetricBadgeText(): Promise<string | undefined> {
    if ((await this.secondaryMetricBadge.count()) === 0) {
      return undefined;
    }
    return (await this.secondaryMetricBadge.innerText()).trim();
  }

  /** Returns the secondary metric's label text, or `undefined` if not rendered. */
  async getSecondaryMetricLabel(): Promise<string | undefined> {
    if ((await this.secondaryMetricLabel.count()) === 0) {
      return undefined;
    }
    return (await this.secondaryMetricLabel.innerText()).trim();
  }

  /** Returns the title and value rendered by a legacy metric visualization. */
  async getLegacyMetricData(): Promise<{ title: string; value: string }> {
    return {
      title: await this.page.testSubj.innerText('metric_label'),
      value: await this.page.testSubj.innerText('metric_value'),
    };
  }

  /** Clicks the legacy metric label (used to create a filter). */
  async clickLegacyMetric() {
    await this.page.testSubj.click('metric_label');
  }

  /** Sets the legacy metric dynamic coloring mode. */
  async setLegacyMetricColoringMode(mode: 'none' | 'labels' | 'background') {
    await this.page.testSubj.click(`lnsLegacyMetric_dynamicColoring_groups_${mode}`);
  }

  /**
   * Parses the inline `style` attribute of the legacy metric value element into a map.
   * Prefer asserting `legacyMetricValue` color with `expect(...).toHaveCSS('color', ...)`
   * over this helper when checking a color that was just changed — coloring updates are
   * debounced, so a point-in-time read of the `style` attribute can race the update, while
   * `toHaveCSS` auto-retries until the color settles.
   */
  async getLegacyMetricStyle(): Promise<Record<string, string>> {
    return parseInlineStyle((await this.legacyMetricValue.getAttribute('style')) ?? '');
  }

  // ---------------------------------------------------------------------------
  // Datatable — cell / header reading
  // ---------------------------------------------------------------------------

  private readonly dataTable = this.page.testSubj.locator('lnsDataTable');

  /**
   * Locator for a Lens datatable cell. Prefer `expect(locator).toContainText(...)`
   * over polling + `getDatatableCellText` when asserting visible values.
   */
  getDatatableCellLocator(rowIndex = 0, colIndex = 0, addRowNumberColumn = true) {
    const col = colIndex + (addRowNumberColumn ? 1 : 0);
    return this.dataTable.locator(
      `[data-test-subj="dataGridRowCell"][data-gridcell-column-index="${col}"][data-gridcell-visible-row-index="${rowIndex}"]`
    );
  }

  private datatableCell(rowIndex: number, colIndex: number, addRowNumberColumn: boolean) {
    return this.getDatatableCellLocator(rowIndex, colIndex, addRowNumberColumn);
  }

  async getDatatableCellText(
    rowIndex = 0,
    colIndex = 0,
    addRowNumberColumn = true
  ): Promise<string> {
    const cell = this.datatableCell(rowIndex, colIndex, addRowNumberColumn);
    await cell.waitFor({ state: 'visible' });
    // EUI data grid can append expand/filter glyphs (↵, ↦) / extra whitespace in innerText.
    return ((await cell.innerText()) ?? '')
      .replace(/[\u21b5\u21a6\u2192]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async getDatatableCellStyle(
    rowIndex = 0,
    colIndex = 0,
    addRowNumberColumn = true
  ): Promise<Record<string, string>> {
    const cell = this.datatableCell(rowIndex, colIndex, addRowNumberColumn);
    await cell.waitFor({ state: 'visible' });
    return parseInlineStyle((await cell.getAttribute('style')) ?? '');
  }

  async getCountOfDatatableColumns(): Promise<number> {
    // FTR parity: EuiDataGrid has no per-column test subj for content cells; `.euiDataGridHeaderCell__content`
    // excludes the leading control column (same selector as FTR `getCountOfDatatableColumns`).
    return this.dataTable.locator('.euiDataGridHeaderCell__content').count();
  }

  async getDatatableHeaderText(index = 0): Promise<string> {
    // Prefer content nodes — columnheader innerText can include action glyphs like ↵.
    // Index matches getCountOfDatatableColumns (control column excluded).
    // FTR parity: EUI class selector until Lens exposes header content test subjects.
    const headers = this.dataTable.locator('.euiDataGridHeaderCell__content');
    await this.page.waitForFunction(
      ({ minCount }) =>
        document.querySelectorAll('[data-test-subj="lnsDataTable"] .euiDataGridHeaderCell__content')
          .length > minCount,
      { minCount: index },
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    const headerContents = await headers.all();
    const headerContent = headerContents[index];
    if (!headerContent) {
      throw new Error(`Datatable header not found at index ${index}`);
    }
    return (await headerContent.innerText()).replace(/\s+/g, ' ').trim();
  }

  // ---------------------------------------------------------------------------
  // Drag and drop — variants beyond shared dragFieldToWorkspace (geo, extra drop
  // types, reorder, keyboard DnD, field-list / data-panel helpers)
  // ---------------------------------------------------------------------------

  /**
   * Geo workspace drop target only mounts after dragstart on a geo field, so
   * Playwright `dragTo` cannot resolve the target up-front. Mirror FTR
   * `html5DragAndDrop`: dispatch dragstart, wait for the geo drop zone, drop.
   */
  async dragFieldToGeoFieldWorkspace(field: string) {
    const fieldLocator = this.getFieldListPanelFieldLocator(field);
    await fieldLocator.waitFor({ state: 'visible' });
    const fieldTestSubj =
      (await fieldLocator.getAttribute('data-test-subj')) ??
      `lnsFieldListPanelField-${this.getFieldAttrName(field)}`;

    await this.page.evaluate((fromSel: string) => {
      interface Transfer {
        data: Record<string, string>;
        setData: (key: string, value: string) => void;
        getData: (key: string) => string;
      }

      function createEvent(typeOfEvent: string) {
        const event = document.createEvent('CustomEvent') as CustomEvent & {
          dataTransfer: Transfer;
        };
        event.initCustomEvent(typeOfEvent, true, true, null);
        event.dataTransfer = {
          data: {},
          setData(key: string, value: string) {
            this.data[key] = value;
          },
          getData(key: string) {
            return this.data[key];
          },
        };
        return event;
      }

      const origin = document.querySelector(`[data-test-subj="${fromSel}"]`);
      if (!origin) {
        throw new Error(`dragFieldToGeoFieldWorkspace: origin not found for ${fromSel}`);
      }
      const dragStartEvent = createEvent('dragstart');
      origin.dispatchEvent(dragStartEvent);
      (window as unknown as { __lensGeoDragTransfer?: Transfer }).__lensGeoDragTransfer =
        dragStartEvent.dataTransfer;
    }, fieldTestSubj);

    const dropTarget = this.page.testSubj.locator('lnsGeoFieldWorkspace');
    await dropTarget.waitFor({ state: 'visible' });

    await this.page.evaluate(() => {
      interface Transfer {
        data: Record<string, string>;
        setData: (key: string, value: string) => void;
        getData: (key: string) => string;
      }
      const transfer = (window as unknown as { __lensGeoDragTransfer?: Transfer })
        .__lensGeoDragTransfer;
      const target = document.querySelector('[data-test-subj="lnsGeoFieldWorkspace"]');
      if (!target || !transfer) {
        throw new Error('dragFieldToGeoFieldWorkspace: drop target or transfer missing');
      }

      function createEvent(typeOfEvent: string) {
        const event = document.createEvent('CustomEvent') as CustomEvent & {
          dataTransfer: Transfer;
        };
        event.initCustomEvent(typeOfEvent, true, true, null);
        event.dataTransfer = transfer!;
        return event;
      }

      target.dispatchEvent(createEvent('dragenter'));
      target.dispatchEvent(createEvent('dragover'));
      target.dispatchEvent(createEvent('drop'));
      delete (window as unknown as { __lensGeoDragTransfer?: Transfer }).__lensGeoDragTransfer;
    });

    await this.waitForLensDragDropToFinish();
  }

  /**
   * HTML5 DnD between dimension triggers/drop targets (FTR `dragDimensionToDimension`).
   * Both `from` and `to` are test-subj chains (e.g. `panel > lns-dimensionTrigger`).
   */
  async dragDimensionToDimension({ from, to }: { from: string; to: string }) {
    // Chains may match multiple nodes (e.g. Y panel with duplicates); wait for presence, not strict unique.
    await this.page.waitForFunction(
      (chain) => {
        const parts = chain.split('>').map((p: string) => p.trim());
        let nodes: Element[] = [document.body];
        for (const part of parts) {
          const next: Element[] = [];
          for (const node of nodes) {
            next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${part}"]`)));
          }
          nodes = next;
        }
        return nodes.length > 0;
      },
      from,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    await this.page.waitForFunction(
      (chain) => {
        const parts = chain.split('>').map((p: string) => p.trim());
        let nodes: Element[] = [document.body];
        for (const part of parts) {
          const next: Element[] = [];
          for (const node of nodes) {
            next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${part}"]`)));
          }
          nodes = next;
        }
        return nodes.length > 0;
      },
      to,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    await this.html5DragAndDrop(from, to);
    await this.waitForLensDragDropToFinish();
  }

  /** Drags a field onto a dimension trigger / empty slot (test-subj chain). */
  async dragFieldToDimensionTrigger(field: string, dimension: string) {
    const fieldLocator = this.getFieldListPanelFieldLocator(field);
    await fieldLocator.waitFor({ state: 'visible' });
    const fieldTestSubj =
      (await fieldLocator.getAttribute('data-test-subj')) ??
      `lnsFieldListPanelField-${this.getFieldAttrName(field)}`;
    await this.page.testSubj.locator(dimension).waitFor({ state: 'visible' });
    await this.html5DragAndDrop(fieldTestSubj, dimension);
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Reorders dimensions within a group (1-based indices, FTR `reorderDimensions`).
   * The reorderable drop layer only mounts after dragstart, so the full DnD runs in-page.
   * Waits for the drop layer to become an active droppable (same signal as `html5DragAndDrop`)
   * instead of a fixed sleep.
   */
  async reorderDimensions(dimension: string, startIndex: number, endIndex: number) {
    await this.page.waitForFunction(
      ({ panelSubj, minCount }) =>
        document.querySelectorAll(`[data-test-subj="${panelSubj}"]`).length >= minCount,
      { panelSubj: dimension, minCount: Math.max(startIndex, endIndex) },
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    await this.page.evaluate(
      async ([panelSubj, startIdx, endIdx]) => {
        interface Transfer {
          data: Record<string, string>;
          setData: (key: string, value: string) => void;
          getData: (key: string) => string;
        }

        function createEvent(typeOfEvent: string) {
          const event = document.createEvent('CustomEvent') as CustomEvent & {
            dataTransfer: Transfer;
          };
          event.initCustomEvent(typeOfEvent, true, true, null);
          event.dataTransfer = {
            data: {},
            setData(key: string, value: string) {
              this.data[key] = value;
            },
            getData(key: string) {
              return this.data[key];
            },
          };
          return event;
        }

        function getReorderDropTarget(): Element | null {
          const panels = Array.from(document.querySelectorAll(`[data-test-subj="${panelSubj}"]`));
          return (
            panels[endIdx - 1]?.querySelector(
              `[data-test-subj="lnsDragDrop-reorderableDropLayer"]`
            ) ?? null
          );
        }

        async function waitForReorderDropTarget(timeout: number) {
          // Reorder drop layers mount after dragstart; they don't always pick up
          // `domDroppable--active` the way group-to-group drops do — wait for mount.
          const deadline = Date.now() + timeout;
          while (Date.now() < deadline) {
            const element = getReorderDropTarget();
            if (element) {
              return element;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          return null;
        }

        const panels = Array.from(document.querySelectorAll(`[data-test-subj="${panelSubj}"]`));
        const origin = panels[startIdx - 1]?.querySelector('.domDraggable');
        if (!origin) {
          throw new Error(
            `reorderDimensions: missing origin for ${panelSubj} index ${startIdx} (found ${panels.length} panels)`
          );
        }
        const dragStartEvent = createEvent('dragstart');
        origin.dispatchEvent(dragStartEvent);

        const target = await waitForReorderDropTarget(2_000);
        if (!target) {
          throw new Error(
            `reorderDimensions: drop layer never mounted for ${panelSubj} index ${endIdx}`
          );
        }
        const dropEvent = createEvent('drop');
        dropEvent.dataTransfer = dragStartEvent.dataTransfer;
        target.dispatchEvent(dropEvent);
        const dragEndEvent = createEvent('dragend');
        dragEndEvent.dataTransfer = dropEvent.dataTransfer;
        origin.dispatchEvent(dragEndEvent);
      },
      [dimension, startIndex, endIndex] as [string, number, number]
    );
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Drags over a dimension group and drops on an extra target (duplicate/swap/combine).
   * Waits for droppable active/hover readiness (same pattern as `html5DragAndDrop`) instead
   * of fixed sleeps.
   */
  private async dragEnterDrop(dragging: string, draggedOver: string, dropTarget: string) {
    await this.page.evaluate(
      async ([fromSel, overSel, dropSel]) => {
        interface Transfer {
          data: Record<string, string>;
          setData: (key: string, value: string) => void;
          getData: (key: string) => string;
        }

        function createEvent(typeOfEvent: string) {
          const event = document.createEvent('CustomEvent') as CustomEvent & {
            dataTransfer: Transfer;
          };
          event.initCustomEvent(typeOfEvent, true, true, null);
          event.dataTransfer = {
            data: {},
            setData(key: string, value: string) {
              this.data[key] = value;
            },
            getData(key: string) {
              return this.data[key];
            },
          };
          return event;
        }

        function queryChain(chain: string): Element | null {
          // CSS selector (starts with `[`) or test-subj chain with `>`
          if (chain.trim().startsWith('[')) {
            return document.querySelector(chain);
          }
          const parts = chain.split('>').map((p) => p.trim());
          let nodes: Element[] = [document.body];
          for (const part of parts) {
            const next: Element[] = [];
            for (const node of nodes) {
              next.push(...Array.from(node.querySelectorAll(`[data-test-subj="${part}"]`)));
            }
            nodes = next;
          }
          return nodes[0] ?? null;
        }

        async function waitForTargetWithClass(chain: string, className: string, timeout: number) {
          const deadline = Date.now() + timeout;
          while (Date.now() < deadline) {
            const element = queryChain(chain);
            if (element?.closest('.domDroppable')?.classList.contains(className)) {
              return element;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          return null;
        }

        async function waitForElement(chain: string, timeout: number) {
          const deadline = Date.now() + timeout;
          while (Date.now() < deadline) {
            const element = queryChain(chain);
            if (element) {
              return element;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          return null;
        }

        const origin = queryChain(fromSel);
        if (!origin) {
          throw new Error(`dragEnterDrop: origin not found for ${fromSel}`);
        }
        const dragStartEvent = createEvent('dragstart');
        origin.dispatchEvent(dragStartEvent);

        const over = await waitForTargetWithClass(overSel, 'domDroppable--active', 2_000);
        if (!over) {
          throw new Error(`dragEnterDrop: draggedOver never became active for ${overSel}`);
        }
        const dragenter = createEvent('dragenter');
        dragenter.dataTransfer = dragStartEvent.dataTransfer;
        over.dispatchEvent(dragenter);
        const dragover = createEvent('dragover');
        dragover.dataTransfer = dragStartEvent.dataTransfer;
        over.dispatchEvent(dragover);

        // Extra drop targets (duplicate/swap/combine) mount after the hover; wait for them
        // rather than sleeping a fixed interval.
        const target = await waitForElement(dropSel, 5_000);
        if (!target) {
          throw new Error(`dragEnterDrop: dropTarget not found for ${dropSel}`);
        }
        const dropEvent = createEvent('drop');
        dropEvent.dataTransfer = dragStartEvent.dataTransfer;
        target.dispatchEvent(dropEvent);
        const dragEndEvent = createEvent('dragend');
        dragEndEvent.dataTransfer = dropEvent.dataTransfer;
        origin.dispatchEvent(dragEndEvent);
      },
      [dragging, draggedOver, dropTarget] as [string, string, string]
    );
  }

  async dragFieldToExtraDropType(
    field: string,
    to: string,
    type: 'duplicate' | 'swap' | 'combine',
    visDataTestSubj?: string
  ) {
    const fieldLocator = this.getFieldListPanelFieldLocator(field);
    await fieldLocator.waitFor({ state: 'visible' });
    const fieldTestSubj =
      (await fieldLocator.getAttribute('data-test-subj')) ??
      `lnsFieldListPanelField-${this.getFieldAttrName(field)}`;
    await this.dragEnterDrop(
      fieldTestSubj,
      `${to} > lnsDragDrop-domDroppable`,
      `${to} > domDragDrop-dropTarget-${type}`
    );
    if (visDataTestSubj) {
      await this.waitForVisualization(visDataTestSubj);
    }
  }

  async dragDimensionToExtraDropType(
    from: string,
    to: string,
    type: 'duplicate' | 'swap' | 'combine',
    visDataTestSubj?: string
  ) {
    await this.page.testSubj.locator(from).waitFor({ state: 'visible' });
    await this.dragEnterDrop(
      from,
      `${to} > lnsDragDrop-domDroppable`,
      `${to} > domDragDrop-dropTarget-${type}`
    );
    if (visDataTestSubj) {
      await this.waitForVisualization(visDataTestSubj);
    }
  }

  /** Active keyboard-DnD drop target key (test-subj or class+text fallback). */
  private async getKeyboardDragActiveKey(): Promise<string> {
    return this.page.evaluate(() => {
      const active = document.querySelector('.domDroppable--active, .domDroppable--hover');
      if (!active) {
        return '';
      }
      return (
        active.getAttribute('data-test-subj') ??
        `${active.className}:${(active.textContent ?? '').slice(0, 40)}`
      );
    });
  }

  /**
   * Pace between Lens keyboard DnD arrow presses (FTR `common.sleep(200)`).
   * Lens does not expose a reliable settle signal here: waiting for
   * `.domDroppable--active` key changes times out on common workspace drops
   * (highlight often updates without a distinct key). Intentional short sleep.
   */
  private async paceKeyboardDragDrop(previousActiveKey?: string): Promise<string> {
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(200);
    return (await this.getKeyboardDragActiveKey()) || previousActiveKey || '';
  }

  /**
   * Keyboard-drags a field onto a drop target by arrow steps (FTR `dragFieldWithKeyboard`).
   */
  async dragFieldWithKeyboard(fieldName: string, steps = 1, reverse = false) {
    const handler = this.page.locator(
      `[data-attr-field="${fieldName}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    // Prefer available-fields handler when the field is listed twice (selected + available).
    const availableHandler = this.page.locator(
      `[data-test-subj="lnsIndexPatternAvailableFields"] [data-attr-field="${fieldName}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    const target = (await availableHandler.count()) > 0 ? availableHandler : handler;
    await target.waitFor({ state: 'visible' });
    await target.focus();
    await this.page.keyboard.press('Enter');
    await this.page.waitForFunction(
      () => document.querySelectorAll('.domDroppable--active').length > 0,
      undefined,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    let activeKey = await this.paceKeyboardDragDrop();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(reverse ? 'ArrowLeft' : 'ArrowRight');
      activeKey = await this.paceKeyboardDragDrop(activeKey);
    }
    await this.page.keyboard.press('Enter');
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Keyboard-moves a dimension by arrow steps (FTR `dimensionKeyboardDragDrop`).
   */
  async dimensionKeyboardDragDrop(group: string, index = 0, steps = 1, reverse = false) {
    const handlersLocator = this.page.locator(
      `[data-test-subj="${group}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    await this.page.waitForFunction(
      ({ groupSubj, min }) =>
        document.querySelectorAll(
          `[data-test-subj="${groupSubj}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
        ).length > min,
      { groupSubj: group, min: index },
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    const handlers = await handlersLocator.all();
    const handler = handlers[index];
    if (!handler) {
      throw new Error(`dimensionKeyboardDragDrop: handler not found at index ${index}`);
    }
    await handler.focus();
    await this.page.keyboard.press('Enter');
    let activeKey = await this.paceKeyboardDragDrop();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(reverse ? 'ArrowLeft' : 'ArrowRight');
      activeKey = await this.paceKeyboardDragDrop(activeKey);
    }
    await this.paceKeyboardDragDrop(activeKey);
    await this.page.keyboard.press('Enter');
    await this.waitForLensDragDropToFinish();
  }

  /**
   * Keyboard-reorders a dimension within its group (FTR `dimensionKeyboardReorder`).
   */
  async dimensionKeyboardReorder(group: string, index = 0, steps = 1, reverse = false) {
    const handlersLocator = this.page.locator(
      `[data-test-subj="${group}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
    );
    await this.page.waitForFunction(
      ({ groupSubj, min }) =>
        document.querySelectorAll(
          `[data-test-subj="${groupSubj}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
        ).length > min,
      { groupSubj: group, min: index },
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    const handlers = await handlersLocator.all();
    const handler = handlers[index];
    if (!handler) {
      throw new Error(`dimensionKeyboardReorder: handler not found at index ${index}`);
    }
    await handler.focus();
    await this.page.keyboard.press('Enter');
    let activeKey = await this.paceKeyboardDragDrop();
    for (let i = 0; i < steps; i++) {
      await this.page.keyboard.press(reverse ? 'ArrowUp' : 'ArrowDown');
      activeKey = await this.paceKeyboardDragDrop(activeKey);
    }
    await this.paceKeyboardDragDrop(activeKey);
    await this.page.keyboard.press('Enter');
    await this.waitForLensDragDropToFinish();
  }

  /** Filters the field list (FTR `searchField`). */
  async searchField(name: string) {
    const input = this.page.testSubj.locator('lnsIndexPatternFieldSearch');
    await input.waitFor({ state: 'visible' });
    await input.fill('');
    await this.page.testSubj.typeWithDelay('lnsIndexPatternFieldSearch', name, { delay: 30 });
  }

  /**
   * Changes the data view in the Lens data panel.
   * Waits for a saved `dataView-{title}` row and fails if it is missing
   * (does not fall back to "Explore matching indices").
   *
   * Does not type into the switcher search box: EuiSelectable filtering races with
   * async option load under CI. Scopes to the :visible switcher because the layer
   * panel also mounts `indexPattern-switcher` (hidden) while the popover is open.
   */
  async switchDataPanelIndexPattern(dataViewTitle: string) {
    const switchLink = this.page.testSubj.locator('lns-dataView-switch-link');
    await switchLink.waitFor({ state: 'visible' });
    if ((await switchLink.innerText()).trim() === dataViewTitle) {
      return;
    }

    await switchLink.click();
    // Layer config also uses `indexPattern-switcher`; only the open popover is visible.
    const switcher = this.page.locator('[data-test-subj="indexPattern-switcher"]:visible');
    await switcher.waitFor({ state: 'visible' });
    const matching = switcher.getByTestId(`dataView-${dataViewTitle}`);
    await matching.waitFor({ state: 'visible' });
    await matching.click();
    await switcher.waitFor({ state: 'hidden' });
    await this.page.testSubj.locator('fieldListLoading').waitFor({ state: 'hidden' });
  }

  // ---------------------------------------------------------------------------
  // Workspace — navigation, apply/discard chrome, settings, tag cloud, ES|QL /
  // inline-editor getters, formula text
  // ---------------------------------------------------------------------------

  public readonly chartTitle = this.page.testSubj.locator('lns_ChartTitle');
  /** XY legend items (elastic-charts does not expose a `data-test-subj` for these). */
  public readonly xyLegendItems = this.page.locator('.echLegendItem');
  // Stable locators as readonly fields (Scout UI best practice); methods stay for parameterized
  // locators and multi-step actions. See docs/extend/testing/ui-best-practices.md.
  readonly convertToEsqlButton = this.page.getByRole('button', { name: 'Convert to ES|QL' });
  readonly convertToEsqlModal = this.page.getByTestId('lnsConvertToEsqlModal');
  readonly convertToEsqlModalConfirmButton = this.page.getByTestId('confirmModalConfirmButton');
  /** Same control as `closeDimensionEditorButton` — kept under this name for flyout-back call sites. */
  readonly secondaryFlyoutBackButton = this.closeDimensionEditorButton;
  readonly inlineEditor = this.page.getByTestId('customizeLens');
  readonly discardChangesModal = this.page.testSubj.locator('lnsApp_discardChangesModalOrigin');
  readonly autoApplyToggle = this.page.testSubj.locator('lnsToggleAutoApply');

  private readonly goBackToAppButton = this.page.testSubj.locator('lnsApp_goBackToAppButton');
  private readonly confirmModalConfirmButton = this.page.testSubj.locator(
    'confirmModalConfirmButton'
  );
  private readonly messageListTrigger = this.page.testSubj.locator('lens-message-list-trigger');
  private readonly settingsButton = this.page.testSubj.locator('lnsApp_settingsButton');
  private readonly settingsMenu = this.page.testSubj.locator('lnsApp__settingsMenu');
  private readonly emptyWorkspacePrompt = this.page.testSubj.locator('workspace-drag-drop-prompt');
  private readonly workspaceApplyChangesPrompt = this.page.testSubj.locator(
    'workspace-apply-changes-prompt'
  );
  private readonly suggestionPanelToggle = this.page.testSubj.locator(
    'lensSuggestionsPanelToggleButton'
  );

  async openFullEditor() {
    await this.page.gotoApp('lens');
    await this.waitForLensApp();
  }

  /**
   * Navigates directly to the Lens editor for a saved visualization and waits for its
   * chart to render. Prefer this over going through the visualize listing page when the
   * saved-object id is known (e.g. fixture-loaded or freshly-saved visualizations).
   *
   * @param id - saved-object id of the Lens visualization
   * @param chartTestSubj - `data-test-subj` of the rendered chart container
   *   (e.g. `xyVisChart`, `partitionVisChart`, `mtrVis`, `legacyMtrVis`,
   *   `lnsVisualizationContainer` for datatable).
   */
  async openEditor(id: string, chartTestSubj: string) {
    await this.page.gotoApp('lens', { hash: `/edit/${id}` });
    await this.waitForVisualization(chartTestSubj);
  }

  /**
   * Adds a new KQL filter row to a filters-aggregation dimension editor.
   *
   * The query input debounces its `onChange` (~256ms; see `useDebouncedValue`
   * in `@kbn/visualization-utils`), so the typed query only reaches the parent
   * `filter.input` after the debounce fires. If we close the popover before
   * then, `FilterPopover.closePopover` resets the input back to the default
   * (`localFilter.input = filter.input`) and the filter reverts to
   * "All records". We wait for the label input's placeholder — which mirrors
   * `localFilter.input.query` — to match the typed query as the visible DOM
   * signal that the debounce has flushed.
   */
  async addFilterToAgg(kql: string) {
    await this.page.testSubj.click('lns-newBucket-add');
    const queryInput = this.page.testSubj.locator('indexPattern-filters-queryStringInput');
    await queryInput.waitFor({ state: 'visible' });
    await queryInput.pressSequentially(kql);
    await this.page.waitForFunction((expected) => {
      const el = document.querySelector('[data-test-subj="indexPattern-filters-label"]');
      return el instanceof HTMLInputElement && el.placeholder === expected;
    }, kql);
    // Close the popover by clicking its trigger button (identified by the typed query text).
    // This toggles `activeFilterId` without invoking `closePopover()` (which resets
    // localFilter.input to the prop value and can race with React's prop propagation).
    await this.page.testSubj
      .locator('indexPattern-filters-existingFilterTrigger')
      .filter({ hasText: kql })
      .click();
  }

  /** Returns the visible label of every existing filter row in a filters-aggregation editor. */
  async getFiltersAggLabels(): Promise<string[]> {
    const filters = await this.page.testSubj
      .locator('indexPattern-filters-existingFilterContainer')
      .all();
    return Promise.all(filters.map(async (filter) => (await filter.innerText()).trim()));
  }

  async enableFilter() {
    await this.page.testSubj.click('indexPattern-advanced-accordion');
    await this.page.testSubj.click('indexPattern-filters-existingFilterTrigger');
  }

  async setFilterBy(queryString: string) {
    await this.page.testSubj
      .locator('indexPattern-filters-queryStringInput')
      .pressSequentially(queryString, { delay: 20 });
    await this.page.testSubj.click('indexPattern-filters-existingFilterTrigger');
  }

  /** Reads the current title displayed in the Lens editor header. */
  async getChartTitle(): Promise<string> {
    return (await this.chartTitle.innerText()).trim();
  }

  async goBackToPreviousApp() {
    await this.goBackToAppButton.click();
  }

  async confirmDiscardChangesModal() {
    await this.discardChangesModal.waitFor({ state: 'visible' });
    await this.confirmModalConfirmButton.click();
    await this.discardChangesModal.waitFor({ state: 'hidden' });
  }

  /** Locator for the "Apply changes" button rendered in the given area. */
  getApplyChangesButton(target: 'toolbar' | 'suggestions' | 'workspace') {
    return this.page.testSubj.locator(`lnsApplyChanges__${target}`);
  }

  /** Clicks the "Apply changes" button in the given area and waits for it to disappear. */
  async applyChanges(target: 'toolbar' | 'suggestions' | 'workspace') {
    const button = this.getApplyChangesButton(target);
    await button.click();
    await button.waitFor({ state: 'hidden' });
  }

  /** Removes all dimensions from the given panel, polling until none remain. */
  async removeAllDimensions(dimensionTestSubj: string) {
    const removeLocator = this.page.testSubj.locator(
      `${dimensionTestSubj} > indexPattern-dimension-remove`
    );
    // Sequential remove+re-render per dimension can exceed the 10s actionTimeout.
    const deadline = Date.now() + 30_000;
    while ((await removeLocator.count()) > 0) {
      if (Date.now() >= deadline) {
        throw new Error(`Timed out removing dimensions for "${dimensionTestSubj}"`);
      }
      const buttons = await removeLocator.all();
      const button = buttons[0];
      if (!button) {
        break;
      }
      const countBefore = buttons.length;
      await button.hover();
      await button.click();
      // waitForFunction has no Scout default (unlike expect/actionTimeout).
      await this.page.waitForFunction(
        ({ panelSubj, before }) => {
          const panel = document.querySelector(`[data-test-subj="${panelSubj}"]`);
          if (!panel) {
            return true;
          }
          return (
            panel.querySelectorAll('[data-test-subj="indexPattern-dimension-remove"]').length <
            before
          );
        },
        { panelSubj: dimensionTestSubj, before: countBefore },
        { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
      );
    }
  }

  /**
   * Reads the current Elastic Charts / embeddable render count for a workspace chart, or
   * `null` when the chart isn't an Elastic Charts visualization (e.g. a data table).
   * Pair with `waitForVisualization(subj, { afterCount })` when the next action must wait
   * for a *new* render pass rather than settling on the current one.
   */
  async getVisualizationRenderCount(chartSubj: string): Promise<number | null> {
    return this.page.evaluate((subj) => {
      const workspaceEl = document.querySelector('[data-test-subj="lnsWorkspace"]');
      const el = workspaceEl?.querySelector(`[data-test-subj="${subj}"]`);
      if (!el) {
        return null;
      }
      const chartStatus = el.querySelector('.echChartStatus');
      const raw =
        el.getAttribute('data-rendering-count') ??
        (chartStatus?.getAttribute('data-ech-render-complete') === 'true'
          ? chartStatus.getAttribute('data-ech-render-count')
          : null);
      if (raw === null) {
        return null;
      }
      const count = Number(raw);
      return Number.isFinite(count) ? count : null;
    }, chartSubj);
  }

  /**
   * Reads `@elastic/charts` debug state after the visualization finishes rendering.
   * Requires `enableElasticChartDebug` (or equivalent init script) before navigation.
   */
  async getCurrentChartDebugState(visType: string): Promise<DebugState> {
    await this.waitForVisualization(visType);
    const chart = this.page.testSubj.locator('lnsWorkspace').getByTestId(visType);
    // Elastic Charts status node — no Lens data-test-subj; same signal as FTR / open-in-Lens helpers.
    await chart.locator('.echChartStatus[data-ech-render-complete="true"]').waitFor({
      state: 'attached',
    });
    const debugJson = await chart.locator('.echChartStatus').getAttribute('data-ech-debug-state');
    if (!debugJson) {
      throw new Error('Elastic charts debugState not found — enable chart debug before navigation');
    }
    return JSON.parse(debugJson) as DebugState;
  }

  async openMessageList() {
    await this.messageListTrigger.click();
  }

  async closeMessageList() {
    await this.messageListTrigger.click();
  }

  getMessageListItems(severity: 'warning' | 'error') {
    return this.page.testSubj.locator(`lens-message-list-${severity}`);
  }

  /**
   * Locator for a Lens datatable-adjacent count of workspace errors shown in the message list
   * pagination. Excludes the prev/next controls, which also share the `pagination-button-`
   * prefix as `pagination-button-previous` / `pagination-button-next`.
   */
  async getWorkspaceErrorCount(): Promise<number> {
    const errors = this.page.testSubj.locator('lnsWorkspaceErrors');
    if ((await errors.count()) === 0) {
      return 0;
    }
    const pagination = this.page.testSubj.locator('lnsWorkspaceErrorsPaginationControl');
    if ((await pagination.count()) === 0) {
      return 1;
    }
    // EUI pagination buttons use data-test-subj pagination-button-{n}; exclude
    // pagination-button-previous/-next, which match the same prefix.
    return pagination
      .locator(
        '[data-test-subj^="pagination-button-"]:not([data-test-subj$="-previous"]):not([data-test-subj$="-next"])'
      )
      .count();
  }

  /** Opens the Lens settings menu (auto-apply toggle lives here). */
  async openSettingsMenu() {
    await this.settingsButton.click();
    await this.settingsMenu.waitFor({ state: 'visible' });
  }

  /** Closes the Lens settings menu. */
  async closeSettingsMenu() {
    await this.settingsButton.click();
    await this.settingsMenu.waitFor({ state: 'hidden' });
  }

  /** Toggles the auto-apply setting. Requires the settings menu to be open. */
  async toggleAutoApply() {
    await this.autoApplyToggle.click();
  }

  /** Waits for the empty Lens workspace drop prompt to be visible. */
  async waitForEmptyWorkspace() {
    await this.emptyWorkspacePrompt.waitFor({ state: 'visible' });
  }

  /** Waits for the workspace "apply changes" prompt (shown when auto-apply is disabled). */
  async waitForWorkspaceWithApplyChangesPrompt() {
    await this.workspaceApplyChangesPrompt.waitFor({ state: 'visible' });
  }

  /**
   * Collapses the suggestions panel.
   * Caller must have suggestions mounted with the panel expanded.
   */
  async closeSuggestionPanel() {
    await this.suggestionPanelToggle.waitFor({ state: 'visible' });
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    await this.page.waitForFunction(
      () =>
        document
          .querySelector('[data-test-subj="lensSuggestionsPanelToggleButton"]')
          ?.getAttribute('aria-expanded') === 'true',
      undefined,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    await this.suggestionPanelToggle.click();
    await this.page.waitForFunction(
      () => {
        const el = document.querySelector('[data-test-subj="lensSuggestionsPanelToggleButton"]');
        return el == null || el.getAttribute('aria-expanded') !== 'true';
      },
      undefined,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
  }

  /** Returns visible tag labels from the Lens tag cloud workspace. */
  async getTagCloudTexts(): Promise<string[]> {
    // SVG <text> nodes — use css= so Playwright does not treat "text" as a text-engine query.
    const tags = this.page.testSubj.locator('tagCloudVisualization').locator('css=text');
    return tags.evaluateAll((elements) =>
      elements.map((el) => (el.textContent ?? '').trim()).filter((text) => text.length > 0)
    );
  }

  /** Clicks a tag cloud label matching `tagDisplayText`. */
  async selectTagCloudTag(tagDisplayText: string): Promise<void> {
    const escaped = tagDisplayText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tag = this.page.testSubj
      .locator('tagCloudVisualization')
      .locator('css=text')
      .filter({ hasText: new RegExp(`^${escaped}$`) });
    await tag.waitFor({ state: 'visible' });
    // SVG <text> hit boxes from Elastic Charts are often too thin for Playwright's
    // actionability hit-test; dispatch a DOM click instead of { force: true }.
    await tag.dispatchEvent('click');
  }

  async setInputValue(testSubj: string, value: string) {
    const input = this.page.locator(`input[data-test-subj="${testSubj}"]`);
    await input.waitFor({ state: 'visible' });
    await input.scrollIntoViewIfNeeded();
    // fill() clears first (avoids "07747" from incomplete selection on number inputs).
    await input.fill(value);
    // Controlled EuiFieldNumber often ignores DOM-only fills — also invoke React onChange
    // with an explicit value (React hijacks input.value so the event must carry it).
    await input.evaluate((el, nextValue) => {
      const inputEl = el as HTMLInputElement & Record<string, unknown>;
      const propsKey = Object.keys(inputEl).find((key) => key.startsWith('__reactProps$'));
      if (!propsKey) {
        return;
      }
      const props = inputEl[propsKey] as {
        onChange?: (e: { target: { value: string }; currentTarget: { value: string } }) => void;
      };
      props.onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } });
    }, value);
    // Sync until React controlled value matches (readiness wait — assertions stay in specs).
    // waitForFunction has no Scout default (unlike expect/actionTimeout).
    await this.page.waitForFunction(
      ({ subj, expected }) => {
        const el = document.querySelector(
          `input[data-test-subj="${subj}"]`
        ) as HTMLInputElement | null;
        return el?.value === expected;
      },
      { subj: testSubj, expected: value },
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
    await input.press('Tab');
    // Blur completed — callers must poll a UI side effect (chart debug, dimension label)
    // before closing flyouts; useDebouncedValue (~256ms) has no DOM readiness hook here.
    await this.page.waitForFunction(
      (subj) => {
        const el = document.querySelector(`input[data-test-subj="${subj}"]`);
        return el != null && document.activeElement !== el;
      },
      testSubj,
      { timeout: WAIT_FOR_FUNCTION_TIMEOUT_MS }
    );
  }

  async toggleFullscreen() {
    await this.page.testSubj.click('lnsFormula-fullscreen');
  }

  /** Returns the current formula Monaco model value (last registered model). */
  async getFormulaText(): Promise<string> {
    const modelIndex = await this.getFormulaModelIndex();
    return this.codeEditor.getCodeEditorValue(modelIndex);
  }
}
