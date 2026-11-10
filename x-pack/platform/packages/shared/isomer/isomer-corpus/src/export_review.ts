/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { THEMES, toStableJson } from './capture_writer';
import { REVIEW_FORMAT, toExpectedStrings } from './review_export';
import type { PanelCapture } from './review_export';

export interface ReviewCase {
  /** `<dashboard>/<panel>`, the directory under the export root. */
  id: string;
  dashboard: string;
  dashboard_id: string;
  panel_id: string;
  title: string | null;
  chart_type: string | null;
  in_as_code: boolean;
  themes: Record<string, { expected: string; screenshot: string | null }>;
}

export interface ReviewIndex {
  format: typeof REVIEW_FORMAT;
  run: unknown;
  cases: ReviewCase[];
  missing_screenshots: string[];
}

const listDirectories = (path: string): string[] =>
  Fs.existsSync(path)
    ? Fs.readdirSync(path, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map(({ name }) => name)
        .sort()
    : [];

const readJson = <T>(path: string): T => JSON.parse(Fs.readFileSync(path, 'utf8')) as T;

/**
 * Exports the captures for Isomer's visual review: per panel and theme, the screenshot and the
 * expected strings and colors, plus an `index.json` that lists every case. Reads only files the
 * capture writes; `outDir` is replaced.
 */
export const exportReview = ({
  capturesDir,
  outDir,
}: {
  capturesDir: string;
  outDir: string;
}): ReviewIndex => {
  const runPath = Path.join(capturesDir, 'run.json');
  if (!Fs.existsSync(runPath)) {
    throw new Error(`No capture run in ${capturesDir}: run the capture first (see the README)`);
  }
  Fs.rmSync(outDir, { recursive: true, force: true });

  const cases: ReviewCase[] = [];
  const missingScreenshots: string[] = [];
  const dashboards = listDirectories(capturesDir).filter((name) =>
    Fs.existsSync(Path.join(capturesDir, name, 'panels'))
  );

  for (const dashboard of dashboards) {
    const panelsDir = Path.join(capturesDir, dashboard, 'panels');
    for (const panel of listDirectories(panelsDir)) {
      const id = `${dashboard}/${panel}`;
      const themes: ReviewCase['themes'] = {};
      let first: PanelCapture | undefined;

      for (const theme of THEMES) {
        const capturePath = Path.join(panelsDir, panel, theme, 'capture.json');
        if (!Fs.existsSync(capturePath)) {
          continue;
        }
        const capture = readJson<PanelCapture>(capturePath);
        first = first ?? capture;

        const caseDir = Path.join(outDir, dashboard, panel);
        Fs.mkdirSync(caseDir, { recursive: true });
        const expected = `${id}/${theme}.expected.json`;
        Fs.writeFileSync(Path.join(outDir, expected), toStableJson(toExpectedStrings(capture)));

        const screenshotPath = Path.join(panelsDir, panel, theme, 'screenshot.png');
        let screenshot: string | null = null;
        if (Fs.existsSync(screenshotPath)) {
          screenshot = `${id}/${theme}.png`;
          Fs.copyFileSync(screenshotPath, Path.join(outDir, screenshot));
        } else {
          missingScreenshots.push(`${id}/${theme}`);
        }
        themes[theme] = { expected, screenshot };
      }

      if (first) {
        cases.push({
          id,
          dashboard,
          dashboard_id: first.dashboard_id,
          panel_id: first.panel_id,
          title: first.panel.title,
          chart_type: first.chart_type,
          in_as_code: first.in_as_code,
          themes,
        });
      }
    }
  }

  const index: ReviewIndex = {
    format: REVIEW_FORMAT,
    run: readJson<unknown>(runPath),
    cases,
    missing_screenshots: missingScreenshots,
  };
  Fs.mkdirSync(outDir, { recursive: true });
  Fs.writeFileSync(Path.join(outDir, 'index.json'), toStableJson(index));
  return index;
};
