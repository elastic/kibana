/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The dashboard demo: each converted Kibana sample dashboard drawn on Kibana's server, through the isomer plugin's
// own server drawing (`createChartsDrawing`: the charts pack on the Elastic Charts node engine, the Vega pack, and the
// maps pack), with per-panel hints and sizes.
//
// node x-pack/platform/plugins/shared/isomer/scripts/render_dashboards.js \
//   --exports <dir of <dashboard>.json and reference PNGs> --out <dir> [--geometry <world countries GeoJSON>] \
//   [--compare] [dashboard ...]
//
// Writes per dashboard <out>/<dashboard>.html, self-contained with its fonts, and <out>/<dashboard>.png, the same
// grid page at 2x through takumi. With --compare, also diffs every drawn panel against its Lens reference.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fromRoot } from '@kbn/repo-info';
import type { MapGeometry } from '@kbn/isomer-primitives-maps';
import { createChartsDrawing } from '../../server/charts_drawing';
import { type ComparedPanel, comparePanels } from './compare';
import { engineHint } from './lens_hints';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

const FONTS = fromRoot('src/core/packages/apps/server-internal/assets/fonts');
const FACES = [
  ['Inter', 'inter/Inter-Regular.woff2', '400'],
  ['Inter', 'inter/Inter-Medium.woff2', '500'],
  ['Inter', 'inter/Inter-SemiBold.woff2', '600'],
  ['Inter', 'inter/Inter-Bold.woff2', '700'],
  ['Elastic UI Numeric', 'elastic_ui_numeric/ElasticUINumeric-Variable.woff2', '100 900'],
] as const;
const DEFAULT_GEOMETRY = fromRoot(
  'x-pack/platform/plugins/shared/maps/test/scout/ui/fixtures/files/world_countries_v7.geo.json'
);

/** Kibana's dashboard grid at a 1600-pixel viewport: 48 columns over 1484 pixels, 28-pixel rows, 8-pixel gutters. */
const GRID = { columns: 48, width: 1484, row: 28, gutter: 8 };
const PAGE_WIDTH = 1532;

const escape = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]!)
  );

const flag = (args: string[], name: string) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args.splice(index, 2)[1];
};

export const run = async () => {
  const args = process.argv.slice(2);
  const exportsDir = flag(args, '--exports');
  const out = flag(args, '--out');
  const geometryFile = flag(args, '--geometry') ?? DEFAULT_GEOMETRY;
  const compare = args.includes('--compare');
  const names = args.filter((arg) => !arg.startsWith('--'));
  if (!exportsDir || !out) {
    throw new Error(
      'usage: render_dashboards --exports <dir> --out <dir> [--geometry <file>] [--compare] [dashboard ...]'
    );
  }
  mkdirSync(out, { recursive: true });
  const geometry: MapGeometry = { world_countries: JSON.parse(readFileSync(geometryFile, 'utf8')) };
  const fontFaces = FACES.map(
    ([family, file, weight]) =>
      `@font-face{font-family:'${family}';src:url('data:font/woff2;base64,${readFileSync(
        join(FONTS, file)
      ).toString('base64')}') format('woff2');font-weight:${weight}}`
  ).join('\n');

  const report: Json = {};
  for (const name of names.length > 0 ? names : ['ecommerce', 'flights', 'logs', 'charts-extra']) {
    const exported: Json = JSON.parse(readFileSync(join(exportsDir, `${name}.json`), 'utf8'));
    const { composition } = exported;
    const nodeOf = (id: string) => composition.body.find((node: Json) => node.id === id);
    const hints = Object.fromEntries(
      Object.entries(exported.hints ?? {}).map(([id, hint]) => [
        id,
        engineHint(hint as Json, nodeOf(id)),
      ])
    );
    const startedAt = performance.now();
    const drawing = await createChartsDrawing({ hints, geometry });
    const engineMs = Math.round(performance.now() - startedAt);
    try {
      const panels: Json[] = [];
      for (const panel of exported.panels as Json[]) {
        if (!panel.grid) {
          continue;
        }
        const { x, y, w, h } = panel.grid;
        const box = {
          left: Math.round((x * GRID.width) / GRID.columns),
          top: y * GRID.row,
          width: Math.round((w * GRID.width) / GRID.columns) - GRID.gutter,
          height: h * GRID.row - GRID.gutter,
        };
        const node = nodeOf(panel.panelId);
        if (!node) {
          const why =
            panel.outcome?.status === 'refused'
              ? `Not drawn: ${(panel.outcome.reasons ?? []).join('; ')}.`
              : panel.chartKind === 'datatable'
              ? 'A data table: Isomer has no table primitive yet.'
              : 'Not drawn by Isomer yet.';
          panels.push({
            ...panel,
            box,
            html: `${
              panel.title ? `<h2 class="outside-title">${escape(panel.title)}</h2>` : ''
            }<p class="outside">${escape(why)}</p>`,
            css: '',
          });
          continue;
        }
        // Drawn at Kibana's own chart area for this panel where the capture measured it.
        const chart = panel.reference?.chartPx ?? {
          width: box.width - 16,
          height: box.height - 40,
        };
        const started = performance.now();
        const { html, css } = await drawing.renderNode(node, chart);
        panels.push({
          ...panel,
          box,
          chart,
          html,
          css,
          ms: Math.round(performance.now() - started),
        });
      }

      const title = escape(exported.dashboard?.title ?? name);
      const gridHeight = Math.max(...panels.map(({ box }) => box.top + box.height));
      const pageHeight = gridHeight + 120;
      const pageCss = `*,*::before,*::after{box-sizing:border-box}
html{font-size:14px}
body,h1,h2,h3,h4,p,ul,ol,li,figure{margin:0;padding:0}
ul,ol{list-style:none}
body{background:#f6f9fc}
.page{width:${PAGE_WIDTH}px;height:${pageHeight}px;font-family:Inter,sans-serif;background:#f6f9fc;color:#1d2a3e;display:flex;flex-direction:column}
.page>header{height:72px;padding:16px 24px;background:#fff;border-bottom:1px solid #e3e8f2}
.page>header h1{margin:0;font-size:20px;font-weight:600}
.page>header p{margin:4px 0 0;color:#516381}
.grid{position:relative;margin:16px 24px;height:${gridHeight}px}
.panel{position:absolute;background:#fff;border:1px solid #e3e8f2;border-radius:6px;padding:8px;overflow:hidden}
.outside-title{font-size:14px;font-weight:600;margin-bottom:4px}
.outside{color:#516381}
${[...new Set(panels.map(({ css }) => css))].join('\n')}`;
      const body = `<div class="page"><header><h1>${title}</h1>
<p>Drawn on Kibana's server through Isomer: charts by Elastic Charts on Skia, Vega by Vega, and maps by the maps pack. No browser was involved.</p></header>
<div class="grid">${panels
        .map(
          ({ panelId, box, html }) =>
            `<section class="panel" data-panel="${escape(panelId)}" style="left:${box.left}px;top:${
              box.top
            }px;width:${box.width}px;height:${box.height}px">${html}</section>`
        )
        .join('')}</div></div>`;
      const htmlFile = join(out, `${name}.html`);
      writeFileSync(
        htmlFile,
        `<!doctype html><html><head><meta charset="utf-8"><title>${title}, drawn on Kibana's server</title>
<style>${fontFaces}</style><style>${pageCss}</style></head><body>${body}</body></html>`
      );
      const pngStarted = performance.now();
      const pngFile = join(out, `${name}.png`);
      writeFileSync(
        pngFile,
        await drawing.rasterize(
          { html: body, css: pageCss, width: PAGE_WIDTH, height: pageHeight },
          2
        )
      );
      const pngMs = Math.round(performance.now() - pngStarted);
      const fidelity = compare
        ? await comparePanels(
            htmlFile,
            exportsDir,
            name,
            panels as ComparedPanel[],
            join(out, `${name}.compare`)
          )
        : undefined;
      report[name] = {
        html: htmlFile,
        png: pngFile,
        engineMs,
        pngMs,
        panels: panels.map(({ panelId, title: panelTitle, chartKind, outcome, ms }) => ({
          panelId,
          title: panelTitle,
          chartKind,
          status: outcome?.status,
          ...(outcome?.omitted?.length ? { omitted: outcome.omitted } : {}),
          ...(ms === undefined ? {} : { ms }),
          ...(fidelity?.[panelId] ? { mismatchedPercent: fidelity[panelId] } : {}),
        })),
      };
      // eslint-disable-next-line no-console
      console.log(name, JSON.stringify({ html: htmlFile, png: pngFile, engineMs, pngMs }));
    } finally {
      await drawing.close();
    }
  }
  writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
};
