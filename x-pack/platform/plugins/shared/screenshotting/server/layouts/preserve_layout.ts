/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'path';
import type { CustomPageSize } from 'pdfmake/interfaces';
import type { LayoutSelectorDictionary, Size } from '../../common/layout';
import { DEFAULT_SELECTORS } from '.';
import type { Layout } from '.';
import { BaseLayout } from './base_layout';
import type { PageSizeParams, PdfImageSize } from './base_layout';

// We default to a zoom of two to bump up the resolution of the screenshot a bit.
// However, Chromium/Skia has a height limit of 16384px, so for anything larger
// than 8000, we should use a zoom of one.
// https://github.com/puppeteer/puppeteer/issues/359
const DEFAULT_ZOOM = 2;
const MAX_HEIGHT_PX = 8000;

export class PreserveLayout extends BaseLayout implements Layout {
  public readonly selectors: LayoutSelectorDictionary;
  public readonly height: number;
  public readonly width: number;
  private readonly zoom: number;
  private readonly scaledHeight: number;
  private readonly scaledWidth: number;
  private imageSize: PdfImageSize = { height: 0, width: 0 };

  constructor(size: Size, selectors?: Partial<LayoutSelectorDictionary>) {
    super('preserve_layout');
    this.height = size.height;
    this.width = size.width;
    this.zoom = this.height <= MAX_HEIGHT_PX ? DEFAULT_ZOOM : 1;
    this.scaledHeight = size.height * this.zoom;
    this.scaledWidth = size.width * this.zoom;

    this.selectors = { ...DEFAULT_SELECTORS, ...selectors };
  }

  public getCssOverridesPath() {
    // TODO: Remove this path once we have migrated all plugins away from depending on this hiding page elements.
    return path.join(__dirname, 'preserve_layout.css');
  }

  public getBrowserViewport() {
    return {
      height: this.scaledHeight,
      width: this.scaledWidth,
    };
  }

  public getBrowserZoom() {
    return this.zoom;
  }

  public getViewport() {
    return {
      height: this.height,
      width: this.width,
      zoom: this.zoom,
    };
  }

  public setPdfImageSize({ height, width }: PdfImageSize): void {
    this.imageSize = { height, width };
  }

  public getPdfImageSize() {
    return this.imageSize;
  }

  public getPdfPageOrientation() {
    return undefined;
  }

  public getPdfPageSize(pageSizeParams: PageSizeParams): CustomPageSize {
    return {
      height:
        this.imageSize.height +
        pageSizeParams.pageMarginTop +
        pageSizeParams.pageMarginBottom +
        pageSizeParams.tableBorderWidth * 2 +
        pageSizeParams.headingHeight +
        pageSizeParams.subheadingHeight,
      width:
        this.imageSize.width +
        pageSizeParams.pageMarginWidth * 2 +
        pageSizeParams.tableBorderWidth * 2,
    };
  }
}
