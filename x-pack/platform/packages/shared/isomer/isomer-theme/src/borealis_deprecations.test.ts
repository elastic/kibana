/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import Path from 'path';
import { getComputed } from '@elastic/eui-theme-common';
import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';
import { toTokenValues } from './to_token_values';

const VARIABLES_DIR = Path.resolve(
  Path.dirname(require.resolve('@elastic/eui-theme-common')),
  'global_styling/variables'
);

// Each type file's deprecated members live under one path of the computed theme.
const SOURCES = [
  { file: 'colors.d.ts', prefix: 'colors.' },
  { file: 'borders.d.ts', prefix: 'border.radius.' },
  { file: 'shadow.d.ts', prefix: 'shadows.' },
] as const;

/** Names of members whose JSDoc carries `@deprecated`. */
const deprecatedNames = (file: string): Set<string> => {
  const names = new Set<string>();
  let deprecated = false;
  for (const line of readFileSync(Path.join(VARIABLES_DIR, file), 'utf8').split('\n')) {
    if (line.includes('@deprecated')) deprecated = true;
    const member = /^\s*(?:readonly\s+)?(\w+)\??:/.exec(line);
    if (member && deprecated) {
      names.add(member[1]);
      deprecated = false;
    }
  }
  return names;
};

const recordReads = <T extends object>(theme: T, reads: Set<string>, path = ''): T =>
  new Proxy(theme, {
    get: (target, key, receiver) => {
      const value = Reflect.get(target, key, receiver);
      if (typeof key !== 'string') return value;
      const keyPath = `${path}${key}`;
      reads.add(keyPath);
      return typeof value === 'object' && value !== null
        ? (recordReads(value, reads, `${keyPath}.`) as unknown)
        : value;
    },
  });

describe('toTokenValues', () => {
  it('reads no deprecated EUI theme token', () => {
    const reads = new Set<string>();
    toTokenValues(recordReads(getComputed(EuiThemeBorealis, {}, 'LIGHT'), reads));

    const deprecatedReads = SOURCES.flatMap(({ file, prefix }) => {
      const names = deprecatedNames(file);
      expect(names.size).toBeGreaterThan(0);
      return [...reads].filter(
        (path) => path.startsWith(prefix) && names.has(path.slice(path.lastIndexOf('.') + 1))
      );
    });

    expect(deprecatedReads).toEqual([]);
  });
});
