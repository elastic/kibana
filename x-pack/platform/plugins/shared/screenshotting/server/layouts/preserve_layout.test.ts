/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PreserveLayout } from './preserve_layout';

it('preserve layout uses default layout selectors', () => {
  const testPreserveLayout = new PreserveLayout({ width: 16, height: 16 });

  testPreserveLayout.setPdfImageSize({ height: 16, width: 16 });

  expect(testPreserveLayout.getCssOverridesPath()).toMatch(`layouts/preserve_layout.css`);
  expect(testPreserveLayout.getBrowserViewport()).toMatchObject({ height: 32, width: 32 });
  expect(testPreserveLayout.getBrowserZoom()).toBe(2);
  expect(testPreserveLayout.getPdfImageSize()).toMatchObject({ height: 16, width: 16 });
  expect(testPreserveLayout.getPdfPageOrientation()).toBe(undefined);
  expect(
    testPreserveLayout.getPdfPageSize({
      pageMarginTop: 27,
      pageMarginBottom: 27,
      pageMarginWidth: 13,
      tableBorderWidth: 67,
      headingHeight: 82,
      subheadingHeight: 96,
    })
  ).toMatchObject({ height: 382, width: 176 });
  expect(testPreserveLayout.selectors).toMatchInlineSnapshot(`
    Object {
      "itemsCountAttribute": "data-shared-items-count",
      "renderComplete": "[data-shared-item]",
      "renderError": "[data-render-error]",
      "renderErrorAttribute": "data-render-error",
      "screenshot": "[data-shared-items-container]",
      "timefilterDurationAttribute": "data-shared-timefilter-duration",
    }
  `);
  expect(testPreserveLayout.height).toBe(16);
  expect(testPreserveLayout.width).toBe(16);
});

it('preserve layout allows customizable selectors', () => {
  const testPreserveLayout = new PreserveLayout(
    { width: 16, height: 16 },
    { renderComplete: '[great-test-selectors]' }
  );

  expect(testPreserveLayout.selectors).toMatchInlineSnapshot(`
    Object {
      "itemsCountAttribute": "data-shared-items-count",
      "renderComplete": "[great-test-selectors]",
      "renderError": "[data-render-error]",
      "renderErrorAttribute": "data-render-error",
      "screenshot": "[data-shared-items-container]",
      "timefilterDurationAttribute": "data-shared-timefilter-duration",
    }
  `);
});

it('preserve layout caps browser zoom for extremely large screenshots to avoid Chromium artifacts', () => {
  // A very tall layout would exceed common graphics limits at zoom=2.
  // (height * 2) would be 53608 which is > 32767.
  const testPreserveLayout = new PreserveLayout({ width: 1727, height: 26804 });

  // The zoom should be reduced so that output height stays <= 32767 pixels.
  expect(testPreserveLayout.getBrowserZoom()).toBeLessThan(2);
  expect(testPreserveLayout.getBrowserViewport().height).toBeLessThanOrEqual(32767);
});

it('preserve layout allows downscaling for very large dimensions', () => {
  const testPreserveLayout = new PreserveLayout({ width: 1000, height: 200000 });
  expect(testPreserveLayout.getBrowserZoom()).toBeGreaterThan(0);
  expect(testPreserveLayout.getBrowserViewport().height).toBeLessThanOrEqual(32767);
});
