/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLazyPageObject, LensApp, type ScoutPage } from '@kbn/scout';
import { LensDatatable } from './lens_datatable';
import { LensDimensions } from './lens_dimensions';
import { LensDragDrop } from './lens_drag_drop';
import { LensLayers } from './lens_layers';
import { LensMetric } from './lens_metric';
import { LensStyle } from './lens_style';
import { LensWorkspace } from './lens_workspace';

/**
 * Lens plugin Scout page object. Extends shared `@kbn/scout` `LensApp` and composes
 * editor-only domains as nested children (e.g. `pageObjects.lens.layers`).
 */
export class LensEditorApp extends LensApp {
  /** Layer tabs, per-layer data-view switch, add/remove. */
  public readonly layers: LensLayers;
  /** Dimension triggers, format params, quick-functions / static-value tabs. */
  public readonly dimensions: LensDimensions;
  /** Style flyout, palette, gauge/heatmap, reference lines, annotations. */
  public readonly style: LensStyle;
  /** Elastic Charts metric tiles and legacy metric. */
  public readonly metric: LensMetric;
  /** Datatable cell / header reading. */
  public readonly datatable: LensDatatable;
  /** Workspace chrome: navigation, apply/discard, settings, tag cloud, formula. */
  public readonly workspace: LensWorkspace;
  /**
   * Drag-and-drop / field-list helpers beyond shared `dragFieldToWorkspace`
   * (geo, extra drop types, reorder, keyboard DnD, data-panel switch).
   */
  public readonly dragDrop: LensDragDrop;

  constructor(page: ScoutPage) {
    super(page);
    this.layers = createLazyPageObject(LensLayers, page);
    this.dimensions = createLazyPageObject(LensDimensions, page, {
      closeDimensionEditorButton: this.closeDimensionEditorButton,
      closeDimensionEditor: () => this.closeDimensionEditor(),
    });
    this.style = createLazyPageObject(LensStyle, page);
    this.metric = createLazyPageObject(LensMetric, page);
    this.datatable = createLazyPageObject(LensDatatable, page);
    this.workspace = createLazyPageObject(LensWorkspace, page, {
      closeDimensionEditorButton: this.closeDimensionEditorButton,
      waitForLensApp: () => this.waitForLensApp(),
      waitForVisualization: (chartTestSubj: string) => this.waitForVisualization(chartTestSubj),
      getFormulaModelIndex: () => this.getFormulaModelIndex(),
      getCodeEditorValue: (modelIndex: number) => this.codeEditor.getCodeEditorValue(modelIndex),
    });
    this.dragDrop = createLazyPageObject(LensDragDrop, page, {
      getFieldAttrName: (field: string) => this.getFieldAttrName(field),
      getFieldListPanelFieldLocator: (field: string) => this.getFieldListPanelFieldLocator(field),
      waitForLensDragDropToFinish: () => this.waitForLensDragDropToFinish(),
      html5DragAndDrop: (from: string, to: string) => this.html5DragAndDrop(from, to),
      waitForVisualization: (chartTestSubj: string) => this.waitForVisualization(chartTestSubj),
    });
  }

  /**
   * Chart-switch options remount under search filtering; Playwright's actionability
   * click flakes ("not stable" / detached). Keep this override in the Lens PO so we
   * do not patch shared `@kbn/scout` `LensApp`.
   */
  override async switchToVisualization(visType: string, options?: { search?: string }) {
    const chartSwitchPopover = this.page.testSubj.locator('lnsChartSwitchPopover');
    const chartSwitchList = this.page.testSubj.locator('lnsChartSwitchList');
    await chartSwitchPopover.click();
    await chartSwitchList.waitFor({ state: 'visible' });
    if (options?.search) {
      const searchInput = this.page.testSubj.locator('lnsChartSwitchSearch');
      await searchInput.waitFor({ state: 'visible' });
      await searchInput.fill(options.search);
    }
    const option = chartSwitchList.getByTestId(`lnsChartSwitchPopover_${visType}`);
    await option.waitFor({ state: 'visible' });
    await option.dispatchEvent('click');
    await chartSwitchList.waitFor({ state: 'hidden' });
  }

  /**
   * Library ("none") save: prefer checking the radio input — label clicks race
   * save-modal remounts. Local override avoids changing shared `@kbn/scout` `LensApp`.
   */
  override async save(
    title: string,
    options?:
      | {
          addToDashboard: 'existing';
          dashboardTitle: string;
        }
      | {
          addToDashboard: 'new';
        }
      | {
          addToDashboard: 'none';
        }
  ) {
    await this.saveButton.click();
    await this.saveModal.waitFor({ state: 'visible' });
    await this.savedObjectTitleInput.fill(title);

    if (options?.addToDashboard === 'existing') {
      await this.page.locator('label[for="existing-dashboard-option"]').click();
      await this.page.testSubj.locator('open-dashboard-picker').click();
      await this.page.testSubj
        .locator(`dashboard-picker-option-${options.dashboardTitle.split(' ').join('-')}`)
        .click();
    } else if (options?.addToDashboard === 'new') {
      await this.page.locator('label[for="new-dashboard-option"]').click();
    } else if (options?.addToDashboard === 'none') {
      await this.page.locator('#add-to-library-option').check();
    }

    await this.confirmSaveButton.click();
    await this.saveModal.waitFor({ state: 'hidden' });
  }
}
