/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';
import { LayoutTypes } from '../constants';
import {
  getDefaultLayoutSelectors,
  Layout,
  LayoutSelectorDictionary,
  PageSizeParams,
  Size,
} from './layout';

// We use a zoom of two to bump up the resolution of the screenshot a bit.
const ZOOM: number = 2;

export class PreserveLayout extends Layout {
  public readonly selectors: LayoutSelectorDictionary = getDefaultLayoutSelectors();
  public readonly groupCount = 1;
  private readonly height: number;
  private readonly width: number;
  private readonly scaledHeight: number;
  private readonly scaledWidth: number;

  constructor(size: Size) {
    super(LayoutTypes.PRESERVE_LAYOUT);
    this.height = size.height;
    this.width = size.width;
    this.scaledHeight = size.height * ZOOM;
    this.scaledWidth = size.width * ZOOM;
  }

  public getCssOverridesPath() {
    return path.join(__dirname, 'preserve_layout.css');
  }

  public getBrowserViewport() {
    return {
      height: this.scaledHeight,
      width: this.scaledWidth,
    };
  }

  public getBrowserZoom() {
    return ZOOM;
  }

  public getViewport() {
    return {
      height: this.scaledHeight,
      width: this.scaledWidth,
      zoom: ZOOM,
    };
  }

  public getPdfImageSize() {
    return {
      height: this.height,
      width: this.width,
    };
  }

  public getPdfPageOrientation() {
    return undefined;
  }

  public getPdfPageSize(pageSizeParams: PageSizeParams) {
    return {
      height:
        this.height +
        pageSizeParams.pageMarginTop +
        pageSizeParams.pageMarginBottom +
        pageSizeParams.tableBorderWidth * 2 +
        pageSizeParams.headingHeight +
        pageSizeParams.subheadingHeight,
      width: this.width + pageSizeParams.pageMarginWidth * 2 + pageSizeParams.tableBorderWidth * 2,
    };
  }
}
