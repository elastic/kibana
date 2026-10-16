/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface ComparedPanel {
  panelId: string;
  outcome?: { nodeType?: string | undefined } | undefined;
  reference?: { png?: string | undefined } | undefined;
  /** The size the panel was drawn at; absent for a panel Isomer did not draw. */
  chart?: unknown;
}

/** Where a panel's drawing sits in the page, by node type: the chart element, as the Lens reference crops it. */
const DRAWING: Record<string, string> = {
  vega: 'svg',
  map: '[data-isomer-map-slot] svg',
};

/**
 * Screenshots each drawn panel in Chromium and counts the pixels that differ from its Lens reference, past a 0.1
 * threshold over the overlapping area, as the charts spike's harness does.
 */
export const comparePanels = async (
  htmlFile: string,
  exportsDir: string,
  name: string,
  panels: ReadonlyArray<{
    panelId: string;
    outcome?: { nodeType?: string };
    reference?: { png?: string };
    chart?: unknown;
  }>,
  out: string
): Promise<Record<string, number>> => {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const results: Record<string, number> = {};
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1200 },
      deviceScaleFactor: 1,
    });
    await page.goto(pathToFileURL(htmlFile).href);
    await page.evaluate(() => document.fonts.ready);
    for (const panel of panels) {
      if (!panel.chart || !panel.reference?.png) {
        continue;
      }
      const type = panel.outcome?.nodeType ?? '';
      const drawing = page
        .locator(`[data-panel="${panel.panelId}"] ${DRAWING[type] ?? '.echChart'}`)
        .first();
      const shot = join(out, `${panel.panelId}.png`);
      await drawing.screenshot({ path: shot });
      const a = PNG.sync.read(readFileSync(join(exportsDir, panel.reference.png)));
      const b = PNG.sync.read(readFileSync(shot));
      const width = Math.min(a.width, b.width);
      const height = Math.min(a.height, b.height);
      const crop = (png: PNG) => {
        const cropped = new PNG({ width, height });
        PNG.bitblt(png, cropped, 0, 0, width, height, 0, 0);
        return cropped.data;
      };
      const diff = new PNG({ width, height });
      const mismatched = pixelmatch(crop(a), crop(b), diff.data, width, height, { threshold: 0.1 });
      writeFileSync(join(out, `${panel.panelId}.diff.png`), PNG.sync.write(diff));
      results[panel.panelId] = Math.round((mismatched / (width * height)) * 10000) / 100;
    }
  } finally {
    await browser.close();
  }
  return results;
};
