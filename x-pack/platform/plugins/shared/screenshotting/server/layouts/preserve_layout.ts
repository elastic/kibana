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
// However, Chromium/Skia can become unstable or produce visual artifacts when the
// output bitmap exceeds certain size limits (observed as blank vertical bands in CI
// for very tall dashboards). We defensively cap the zoom so that the *output*
// dimension in device pixels stays within a safe range.
const DEFAULT_ZOOM = 2;
// 32767 is a common upper bound in graphics stacks (int16 boundary). Keeping under
// this avoids known "blank stripe" artifacts for extremely large screenshots.
const MAX_OUTPUT_DIMENSION_PX = 32767;
// Allow downscaling if needed (deviceScaleFactor < 1), but keep a small floor to
// avoid invalid values.
const MIN_ZOOM = 0.25;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
    const maxDimension = Math.max(size.width, size.height);
    const zoomCap = maxDimension > 0 ? MAX_OUTPUT_DIMENSION_PX / maxDimension : DEFAULT_ZOOM;
    this.zoom = clamp(Math.min(DEFAULT_ZOOM, zoomCap), MIN_ZOOM, DEFAULT_ZOOM);

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
