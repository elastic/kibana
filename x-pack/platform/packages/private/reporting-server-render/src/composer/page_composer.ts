/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryReport } from '../services/memory_sampler';

/**
 * A single rendered panel, positioned on the page in CSS pixels. `html` is either an
 * `<img>` tag pointing at a data URL (for the Elastic-Charts-family panels rasterized by
 * {@link renderElasticChartsToPng}) or a DOM-only panel's serialized markup (markdown,
 * tables lowered to `<table>`, etc. -- see the package README's coverage matrix for which
 * panel types land here today).
 */
export interface ComposedPanel {
  left: number;
  top: number;
  width: number;
  height: number;
  title?: string;
  html: string;
  /**
   * The panel's `html` already is the whole panel -- its own header/border included, because
   * it is a rasterization of the real dashboard panel -- so the composer adds no frame, padding
   * or title of its own. Unset for panels with no DOM of their own (maps).
   */
  bare?: boolean;
}

export interface ComposedPage {
  width: number;
  height: number;
  title?: string;
  panels: ComposedPanel[];
  /**
   * Extra CSS to append after `PAGE_CSS`, e.g. `render_dashboard_report.ts`'s live
   * stylesheet text for hand-built markup. Dashboard panels no longer use it: each is rasterized
   * with its own CSS (see `element_sinks.ts`'s `sinkPanelElement`).
   */
  extraCss?: string;
  /** Panels that did not render faithfully (stuck, failed, placeholder); surfaced as report warnings. */
  warnings?: string[];
  /** Process memory before, at peak, and after this render; see `memory_sampler.ts`. */
  memory?: MemoryReport;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

/**
 * `.reportingPanel` deliberately carries no `overflow: hidden` -- confirmed live (and
 * isolated down to this one declaration via a bisection of every rule in this stylesheet)
 * that Takumi's PDF engine silently drops *any* `<img>` descendant of an element with
 * `overflow: hidden` in its matched styles: the render succeeds (no thrown error) but
 * produces a near-empty page for that subtree, with no diagnostic of any kind. Every
 * canvas-backed panel (`pngPanelHtml`'s `<img src="data:...">`, see `element_sinks.ts`) is
 * nested inside `.reportingPanel > .reportingPanel__body`, so this one declaration was
 * silently blanking every chart/map/metric panel in a real multi-panel dashboard export
 * while DOM-only panels (no `<img>`) rendered fine -- the exact split observed live. Each
 * panel is already absolutely positioned with explicit `width`/`height` matching its
 * content's own size, so there is nothing for `overflow: hidden` to actually clip here; a
 * DOM-only panel's content overflowing its box slightly is an existing, documented fidelity
 * gap (see the package README's "Fidelity bar" section), not a new one this introduces.
 */
const PAGE_CSS = `
  .reportingPage { position: relative; box-sizing: border-box; background: #ffffff; font-family: Inter, sans-serif; }
  .reportingPage__title { position: absolute; left: 16px; top: 12px; font-size: 18px; font-weight: 600; color: #1a1c21; }
  .reportingPanel { position: absolute; box-sizing: border-box; border: 1px solid #d3dae6; border-radius: 4px; background: #fff; padding: 8px; }
  .reportingPanel__title { font-size: 12px; font-weight: 600; color: #343741; margin-bottom: 4px; }
  .reportingPanel__body { font-size: 13px; color: #343741; }
`;

/**
 * Builds the `{ html, css, width, height }` input `@elastic/isomer-image-takumi`'s
 * `TakumiBackend.png`/`.pdf` take directly (via `@takumi-rs/helpers`'s `fromHtml`), bypassing
 * Isomer's primitive/pack/validation layer entirely: a dashboard's arbitrary grid of
 * absolutely-positioned panels is not a document Isomer's composition model (which
 * `estimateSnapshotHeight` stacks, and which degrades to Markdown/Slack) is built to
 * describe. Takumi's own CSS-subset renderer is the right layer for this; Isomer is not
 * used in this package's page-composition path. See the coverage matrix in the package
 * README for what this finding means for the two systems' division of labor.
 */
export const composePage = (
  page: ComposedPage
): { html: string; css: string; width: number; height: number } => {
  const titleHtml = page.title
    ? `<div class="reportingPage__title">${escapeHtml(page.title)}</div>`
    : '';

  const panelsHtml = page.panels
    .map((panel) => {
      if (panel.bare) {
        return `<div style="position:absolute;left:${panel.left}px;top:${panel.top}px;width:${panel.width}px;height:${panel.height}px;">${panel.html}</div>`;
      }
      const titleHtml2 = panel.title
        ? `<div class="reportingPanel__title">${escapeHtml(panel.title)}</div>`
        : '';
      return `<div class="reportingPanel" style="left:${panel.left}px;top:${panel.top}px;width:${panel.width}px;height:${panel.height}px;">${titleHtml2}<div class="reportingPanel__body">${panel.html}</div></div>`;
    })
    .join('');

  const html = `<div class="reportingPage" style="width:${page.width}px;height:${page.height}px;">${titleHtml}${panelsHtml}</div>`;
  const css = page.extraCss ? `${PAGE_CSS}\n${page.extraCss}` : PAGE_CSS;

  return { html, css, width: page.width, height: page.height };
};

/** Wraps a rasterized panel's PNG bytes as the `<img>` markup `composePage` expects. */
export const pngPanelHtml = (png: Buffer, { width, height }: { width: number; height: number }) =>
  `<img src="data:image/png;base64,${png.toString(
    'base64'
  )}" width="${width}" height="${height}" />`;
