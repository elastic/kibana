/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';

// EUI ships no types for its icon registry; all that is needed from it is the names.
const { typeToPathMap } = jest.requireActual<{ typeToPathMap: Record<string, string> }>(
  '@elastic/eui/lib/components/icon/icon_map'
);

const PUBLIC_DIR = resolve(__dirname, '..');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

/** `iconType="x"`, `iconType: 'x'` and `getIconType: () => 'x'`, the ways this plugin names an icon. */
const ICON_NAME = /(?:iconType[=:]\s*\{?|getIconType:\s*\(\)\s*=>\s*)["']([A-Za-z0-9_]+)["']/g;

describe('icons', () => {
  const used = sourceFiles(PUBLIC_DIR).flatMap((file) =>
    Array.from(readFileSync(file, 'utf8').matchAll(ICON_NAME), ([, name]) => ({
      name,
      file: file.replace(PUBLIC_DIR, 'public'),
    }))
  );

  it('finds the icons the plugin uses', () => {
    // Guards against the pattern above silently matching nothing.
    expect(used.length).toBeGreaterThan(10);
  });

  it('only uses icons EUI has: an unknown name renders as an empty box, not an error', () => {
    const unknown = used.filter(({ name }) => !(name in typeToPathMap));

    expect(unknown).toEqual([]);
  });
});

describe('icons of the components', () => {
  const { CARD_ICONS } = jest.requireActual<{ CARD_ICONS: readonly string[] }>(
    '@kbn/custom-app-common'
  );

  it.each([...CARD_ICONS, 'sortUp', 'sortDown'])('has an EUI icon called %s', (name) => {
    expect(Object.keys(typeToPathMap)).toContain(name);
  });
});
