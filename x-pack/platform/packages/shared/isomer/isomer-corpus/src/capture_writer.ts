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

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])])
    );
  }
  return value;
};

/**
 * Pretty JSON with sorted keys and a trailing newline, so captured files diff cleanly: key order
 * in Elasticsearch responses and Kibana state is not stable, and carries no meaning.
 */
export const toStableJson = (value: unknown): string =>
  `${JSON.stringify(sortKeys(value), null, 2)}\n`;

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
 * round_trip/<dashboard>.json
 * round_trip/report.md
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
  roundTrip: (dashboard: string) => Path.join('round_trip', `${toPathSegment(dashboard)}.json`),
  roundTripReport: () => Path.join('round_trip', 'report.md'),
  panelScreenshot: (dashboard: string, panel: string, theme: Theme) =>
    Path.join(toPathSegment(dashboard), 'panels', toPathSegment(panel), theme, 'screenshot.png'),
};

export interface CaptureWriter {
  root: string;
  writeJson: (relativePath: string, value: unknown) => void;
  writeBinary: (relativePath: string, contents: Buffer) => void;
  writeText: (relativePath: string, contents: string) => void;
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
    writeText: (relativePath, contents) => Fs.writeFileSync(resolve(relativePath), contents),
  };
};
