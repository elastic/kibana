/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

/** Turns an ID or title into a path segment: lowercase letters, digits, `-` and `_` only. */
export const toPathSegment = (value: string): string => {
  const segment = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!segment) {
    throw new Error(`Cannot build a path segment from ${JSON.stringify(value)}`);
  }
  return segment;
};

/** Pretty JSON with a trailing newline, so captured files diff cleanly. */
export const toStableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/**
 * The capture layout, relative to the output root:
 *
 * ```
 * run.json
 * <dashboard>/dashboard.json
 * <dashboard>/summary.<theme>.json
 * <dashboard>/visualizations/<ref_id>.json
 * <dashboard>/panels/<panel>/config.json
 * <dashboard>/panels/<panel>/<theme>/{capture.json,screenshot.png}
 * ```
 */
export const capturePaths = {
  run: () => 'run.json',
  dashboard: (dashboard: string) => Path.join(toPathSegment(dashboard), 'dashboard.json'),
  summary: (dashboard: string, theme: Theme) =>
    Path.join(toPathSegment(dashboard), `summary.${theme}.json`),
  visualization: (dashboard: string, refId: string) =>
    Path.join(toPathSegment(dashboard), 'visualizations', `${toPathSegment(refId)}.json`),
  panelConfig: (dashboard: string, panel: string) =>
    Path.join(toPathSegment(dashboard), 'panels', toPathSegment(panel), 'config.json'),
  panelCapture: (dashboard: string, panel: string, theme: Theme) =>
    Path.join(toPathSegment(dashboard), 'panels', toPathSegment(panel), theme, 'capture.json'),
  panelScreenshot: (dashboard: string, panel: string, theme: Theme) =>
    Path.join(toPathSegment(dashboard), 'panels', toPathSegment(panel), theme, 'screenshot.png'),
};

export interface CaptureWriter {
  root: string;
  writeJson: (relativePath: string, value: unknown) => void;
  writeBinary: (relativePath: string, contents: Buffer) => void;
}

export const createCaptureWriter = (root: string): CaptureWriter => {
  const resolve = (relativePath: string) => {
    const target = Path.resolve(root, relativePath);
    if (!target.startsWith(Path.resolve(root) + Path.sep)) {
      throw new Error(`Refusing to write outside the capture root: ${relativePath}`);
    }
    Fs.mkdirSync(Path.dirname(target), { recursive: true });
    return target;
  };

  return {
    root,
    writeJson: (relativePath, value) =>
      Fs.writeFileSync(resolve(relativePath), toStableJson(value)),
    writeBinary: (relativePath, contents) => Fs.writeFileSync(resolve(relativePath), contents),
  };
};
