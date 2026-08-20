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
}
