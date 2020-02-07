/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver } from '../../../server/browsers/chromium/driver';
import { LevelLogger } from '../../../server/lib';

export interface ViewZoomWidthHeight {
  zoom: number;
  width: number;
  height: number;
}

export interface PageSizeParams {
  pageMarginTop: number;
  pageMarginBottom: number;
  pageMarginWidth: number;
  tableBorderWidth: number;
  headingHeight: number;
  subheadingHeight: number;
}

export interface LayoutSelectorDictionary {
  screenshot: string;
  renderComplete: string;
  itemsCountAttribute: string;
  timefilterDurationAttribute: string;
  toastHeader: string;
}

export interface PdfImageSize {
  width: number;
  height?: number;
}

export const getDefaultLayoutSelectors = (): LayoutSelectorDictionary => ({
  screenshot: '[data-shared-items-container]',
  renderComplete: '[data-shared-item]',
  itemsCountAttribute: 'data-shared-items-count',
  timefilterDurationAttribute: 'data-shared-timefilter-duration',
  toastHeader: '[data-test-subj="euiToastHeader"]',
});

export abstract class Layout {
  public id: string = '';

  constructor(id: string) {
    this.id = id;
  }

  public abstract getPdfImageSize(): PdfImageSize;

  public abstract getPdfPageOrientation(): string | undefined;

  public abstract getPdfPageSize(pageSizeParams: PageSizeParams): string | Size;

  public abstract getViewport(itemsCount: number): ViewZoomWidthHeight;

  public abstract getBrowserZoom(): number;

  public abstract getBrowserViewport(): Size;

  public abstract getCssOverridesPath(): string;
}

export interface Size {
  width: number;
  height: number;
}

export interface LayoutParams {
  id: string;
  dimensions: Size;
}

export type LayoutInstance = Layout & {
  // Fields that are not part of Layout: the instances
  // independently implement these fields on their own
  selectors: LayoutSelectorDictionary;
  positionElements?: (browser: HeadlessChromiumDriver, logger: LevelLogger) => Promise<void>;
};
