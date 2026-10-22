/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import Path from 'path';
import type { ComposedPanel } from '../composer/page_composer';
import { pngPanelHtml } from '../composer/page_composer';
import { rasterizePanelToPng } from '../composer/rasterize_panel';
import { getTakumiBackend } from '../composer/rasterize_page';
import { EUI_DATA_GRID_HEADER_HEIGHT_PX } from './panel_rect_assigner';
import type { CssNode } from '../lowering/css_parser';
import { buildScopeIndex, lowerInlineStylesFrom, lowerStylesheets } from '../lowering/takumi_css';
import type { HeadlessDomEnvironment } from './headless_dom_environment';
import type { PanelPixelPosition } from './dashboard_panel_layout';
import { LAYOUT_SELECTORS } from './layout_selectors';
import { gridItemDomId } from './panel_rect_assigner';

/**
 * Pairs each panel position with its `[data-shared-item]` element by the dashboard grid
 * item's stable `panel-${panelIndex}` DOM id (see `panel_rect_assigner.ts`), not by DOM
 * order: panels mount in an order unrelated to their position in the grid. Throws, naming
 * the panel, when one has no rendered element rather than silently misaligning panels with
 * the wrong positions.
 */
export const matchPanelsToElements = (
  document: Document,
  positions: PanelPixelPosition[]
): Array<{ element: Element; position: PanelPixelPosition }> =>
  positions.map((position) => {
    const gridItem = document.getElementById(gridItemDomId(position.panelIndex));
    const element = gridItem
      ? gridItem.hasAttribute('data-shared-item')
        ? gridItem
        : Array.from(gridItem.querySelectorAll(LAYOUT_SELECTORS.renderComplete))[0]
      : undefined;
    if (!element) {
      throw new Error(
        `Dashboard did not render a panel element for panel "${position.panelIndex}"` +
          `${position.title ? ` (${position.title})` : ''}; cannot match it to its position.`
      );
    }
    return { element, position };
  });

/**
 * Elements removed from a panel's clone before it is rasterized: content a sighted user
 * never sees (EUI's screen-reader-only text, including the Linear A sentinel characters
 * `EuiDataGrid`'s clipboard support writes into it), focus-trap guards, and anything the
 * Chromium pipeline hides for sharing (`preserve_layout.css`'s `.hide-for-sharing`).
 * `getElementsByClassName`/`getElementsByTagName` rather than `querySelectorAll`: no
 * selector compilation involved.
 */
const REMOVED_CLASS_NAMES = ['euiScreenReaderOnly', 'echScreenReaderOnly', 'hide-for-sharing'];
const REMOVED_TAG_NAMES = ['script', 'noscript'];

const removeUnrenderableContent = (clone: Element) => {
  const doomed: Element[] = [];
  for (const className of REMOVED_CLASS_NAMES) {
    doomed.push(...Array.from(clone.getElementsByClassName(className)));
  }
  for (const tagName of REMOVED_TAG_NAMES) {
    doomed.push(...Array.from(clone.getElementsByTagName(tagName)));
  }
  for (const element of Array.from(clone.getElementsByTagName('*'))) {
    if (element.hasAttribute('data-focus-guard')) doomed.push(element);
  }
  for (const element of doomed) element.remove();
};

/** The CSS pixel size a canvas is displayed at: its inline style, else its pixel buffer at the page's device pixel ratio. */
const canvasCssSize = (canvas: HTMLCanvasElement, devicePixelRatio: number) => {
  const style = canvas.style;
  const width = parseFloat(style?.width ?? '') || canvas.width / devicePixelRatio;
  const height = parseFloat(style?.height ?? '') || canvas.height / devicePixelRatio;
  return { width, height };
};

/**
 * Replaces each `<canvas>` in `clone` with an `<img>` of its backing skia surface, in the
 * same place and at the same size, so everything around a chart's canvas (legend, title,
 * annotation markers, empty-state text) stays in the markup and is rendered with it. The
 * original, live canvases are matched to the clone's by order.
 */
const replaceCanvasesWithImages = (
  env: HeadlessDomEnvironment,
  original: Element,
  clone: Element
): number => {
  const originals = Array.from(original.getElementsByTagName('canvas'));
  const clones = Array.from(clone.getElementsByTagName('canvas'));
  const devicePixelRatio =
    (env.window as unknown as { devicePixelRatio?: number }).devicePixelRatio ?? 2;
  let replaced = 0;
  originals.forEach((canvas, i) => {
    const target = clones[i];
    if (!target) return;
    const backing = env.getBackingCanvas(canvas);
    if (!backing || backing.width <= 1 || backing.height <= 1) {
      // Never drawn to (or a 1x1 probe canvas): nothing to show.
      target.remove();
      return;
    }
    const { width, height } = canvasCssSize(canvas as HTMLCanvasElement, devicePixelRatio);
    const img = env.document.createElement('img');
    img.setAttribute(
      'src',
      `data:image/png;base64,${backing.toBuffer('image/png').toString('base64')}`
    );
    img.setAttribute('width', String(Math.round(width)));
    img.setAttribute('height', String(Math.round(height)));
    const className = target.getAttribute('class');
    if (className) img.setAttribute('class', className);
    // `display:block`: a canvas is inline by default, but an image-in-flow would add baseline gap.
    img.setAttribute('style', `display:block;width:${width}px;height:${height}px`);
    target.parentNode?.replaceChild(img, target);
    replaced++;
  });
  return replaced;
};

interface MeasuredBox {
  height: number;
  children: MeasuredBox[];
}

/**
 * Takumi's measured layout carries no attributes unless its child count happens to match the
 * source's, so an element's box is found by its path of child-element indexes from `root`
 * (layout children mirror element children one to one).
 */
const findMeasuredBox = (
  layout: MeasuredBox,
  root: Element,
  target: Element
): MeasuredBox | undefined => {
  const path: number[] = [];
  for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
    if (!el.parentElement) return undefined;
    path.unshift(Array.from(el.parentElement.children).indexOf(el));
  }
  let box: MeasuredBox | undefined = layout;
  for (const index of path) box = box?.children[index];
  return box;
};

/**
 * `EuiDataGrid` lays its body rows out absolutely, `top` already offset by the height of the
 * header row *as the browser measured it*. Takumi lays that header out itself (its own text
 * wrapping, so a header allowed three lines can be taller or shorter than the 32px the
 * client was told), and the in-flow header then paints over -- or leaves a gap above -- the
 * first rows. Measures the header Takumi actually produced and shifts every row by the
 * difference.
 */
const alignDataGridRows = async (
  root: Element,
  css: string,
  { width, height }: { width: number; height: number }
) => {
  const headerElement = root.getElementsByClassName('euiDataGridHeader')[0];
  if (!headerElement) return;
  const rows = Array.from(root.getElementsByClassName('euiDataGridRow')) as HTMLElement[];
  if (rows.length === 0) return;
  const layout = (await getTakumiBackend().measure({
    html: root.outerHTML,
    css,
    width,
    height,
  })) as unknown as MeasuredBox;
  const header = findMeasuredBox(layout, root, headerElement);
  if (!header) return;
  const delta = Math.round(header.height - EUI_DATA_GRID_HEADER_HEIGHT_PX);
  if (Math.abs(delta) < 1) return;
  for (const row of rows) {
    const top = parseFloat(row.style.top);
    if (Number.isFinite(top)) row.style.top = `${top + delta}px`;
  }
};

export interface PanelCss {
  /** Every page stylesheet, parsed once per report (see `parseStylesheets`). */
  parsedSheets: CssNode[][];
  /** Total characters of CSS the sheets came from; for the usage log only. */
  bytesIn: number;
}

/**
 * Sinks one dashboard panel to a `ComposedPanel`: the live `[data-shared-item]` element is
 * cloned, its canvases swapped for images of their backing surfaces, content a viewer never
 * sees stripped, inline styles lowered for Takumi, and the result rendered -- together with
 * the page's stylesheets, pruned to what this markup can use -- to one PNG by Takumi.
 *
 * One path for every panel type, canvas-backed or not: the old canvas branch (read back the
 * largest canvas and discard the rest of the panel) lost every legend, annotation marker,
 * and empty-state message, and left a Bullet gauge on a small panel blank (its canvas is
 * cleared when it falls back to DOM). The panel's own `figcaption` header is part of the
 * clone, so the composer draws no title of its own.
 */
export const sinkPanelElement = async (
  env: HeadlessDomEnvironment,
  element: Element,
  position: PanelPixelPosition,
  { parsedSheets, bytesIn }: PanelCss
): Promise<ComposedPanel> => {
  const { left, top, width, height } = position;
  const label = position.title ?? element.getAttribute('data-title') ?? position.panelIndex;

  const startedAt = Date.now();
  const clone = element.cloneNode(true) as Element;
  // First, while the clone still mirrors the original element for element: see
  // `lowerInlineStylesFrom` for why this reads the original's style objects.
  lowerInlineStylesFrom(element, clone);
  removeUnrenderableContent(clone);
  const canvasCount = replaceCanvasesWithImages(env, element, clone);

  const root = env.document.createElement('div');
  root.setAttribute('class', 'reportingPanelRoot');
  root.setAttribute(
    'style',
    `position:relative;overflow:hidden;box-sizing:border-box;border:1px solid #e3e8f2;border-radius:6px;width:${width}px;height:${height}px;`
  );
  root.appendChild(clone);

  const { css, stats } = lowerStylesheets(parsedSheets, buildScopeIndex(root), bytesIn);
  const loweredAt = Date.now();
  try {
    await alignDataGridRows(root, css, { width, height });
  } catch (error) {
    env.usageLog.record('dataGrid.alignFailed', String(error).slice(0, 200));
  }
  env.usageLog.record(
    'panelCss.lowered',
    `${label}: ${stats.rulesIn}->${stats.rulesOut} rules, ${stats.bytesIn}->${stats.bytesOut} chars, ${canvasCount} canvas(es)`
  );

  // Debug aid: set to a directory to get each panel's lowered markup and CSS written next to
  // its index, for diagnosing a panel that renders wrong without re-instrumenting the sink.
  const dumpDir = process.env.REPORTING_SERVER_RENDER_DUMP_DIR;
  if (dumpDir) {
    fs.mkdirSync(dumpDir, { recursive: true });
    fs.writeFileSync(Path.join(dumpDir, `panel_${position.panelIndex}.html`), root.outerHTML);
    fs.writeFileSync(Path.join(dumpDir, `panel_${position.panelIndex}.css`), css);
  }

  const alignedAt = Date.now();
  const { png, warning } = await rasterizePanelToPng(
    { html: root.outerHTML, css, width, height },
    { usageLog: env.usageLog, label }
  );
  env.usageLog.record(
    'panel.timing',
    `${label}: prepare+lower ${loweredAt - startedAt}ms, align ${alignedAt - loweredAt}ms, raster ${
      Date.now() - alignedAt
    }ms`
  );
  if (warning) env.usageLog.record('panel.warning', warning);

  return {
    left,
    top,
    width,
    height,
    html: pngPanelHtml(png, { width, height }),
    bare: true,
  };
};
