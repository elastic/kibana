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
  private readonly addToLibraryCheckbox;
  private readonly addToLibraryCheckboxLabel;
  private readonly newDashboardOption;
  private readonly existingDashboardOption;
  private readonly openDashboardPicker;

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
    this.addToLibraryCheckbox = this.page.locator('input#add-to-library-checkbox');
    this.addToLibraryCheckboxLabel = this.page.locator('label[for="add-to-library-checkbox"]');
    this.newDashboardOption = this.page.locator('#new-dashboard-option');
    this.existingDashboardOption = this.page.locator('#existing-dashboard-option');
    this.openDashboardPicker = this.page.testSubj.locator('open-dashboard-picker');
  }

  /**
   * Saves from the Lens editor into a new or existing dashboard, with explicit
   * by-value / by-reference and save-as-new controls.
   *
   * Local until shared `LensApp.save()` grows `saveToLibrary` (after #285654's
   * `saveAsNew` lands). Do not override `save()`.
   */
  async saveToDashboard(
    title: string,
    options: (
      | {
          addToDashboard: 'existing';
          dashboardTitle: string;
        }
      | {
          addToDashboard: 'new';
        }
    ) & {
      saveAsNew?: boolean;
      saveToLibrary?: boolean;
    }
  ) {
    // Dismiss leftover toasts before opening the modal. Clicking a toast close
    // while the modal is open is an EUI `ownFocus` outside click and closes it.
    await this.page.components.toast().closeAll();
    await this.saveButton.click();
    await this.saveModal.waitFor({ state: 'visible' });
    await this.savedObjectTitleInput.fill(title);

    // Existing-lens copies must flip this before the dashboard radios (they stay
    // disabled until save-as-new is on).
    if (options.saveAsNew) {
      await this.setEuiSwitch('saveAsNewCheckbox', true);
    }

    if (options.addToDashboard === 'existing') {
      await this.existingDashboardOption.check();
      await this.openDashboardPicker.click();
      await this.page.testSubj
        .locator(`dashboard-picker-option-${options.dashboardTitle.split(' ').join('-')}`)
        .click();
    } else {
      await this.newDashboardOption.check();
    }

    if (options.saveToLibrary !== undefined) {
      await this.addToLibraryCheckbox.waitFor({ state: 'attached' });
      const isChecked = await this.addToLibraryCheckbox.isChecked();
      if (isChecked !== options.saveToLibrary) {
        await this.addToLibraryCheckboxLabel.click();
      }
    }

    await this.confirmSaveButton.click();
    await this.saveModal.waitFor({ state: 'hidden' });
  }
}
