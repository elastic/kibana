/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The corpus a lowering is tested against: every saved object in the repo's fixtures and archives, so a lowering
// covers what Kibana's own tests exercise and not only the sample dashboards.

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface CorpusObject {
  file: string;
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  references: Array<{ name: string; type: string; id: string }>;
}

const REPO_ROOT = join(__dirname, '../../../../../../..');
const ROOTS = ['src', 'x-pack'];
const SKIP = new Set(['node_modules', 'target', 'build', '.git', '.es']);
const CORPUS_DIR = /(^|\/)(fixtures|kbn_archiver|kbn_archives|sample_data)(\/|$)/;

const walk = (dir: string, files: string[]): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) walk(join(dir, entry.name), files);
    } else if (/\.(ndjson|json)$/.test(entry.name)) {
      files.push(join(dir, entry.name));
    }
  }
};

/** JSON values one after another, as kbn_archiver writes them, or one per line. */
const parseSequence = (text: string): unknown[] => {
  const values: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (char === '\\') index += 1;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          values.push(JSON.parse(text.slice(start, index + 1)));
        } catch {
          // Not a saved object; a corpus file can hold other JSON.
        }
        start = -1;
      }
    }
  }
  return values;
};

let cache: CorpusObject[] | undefined;

/** Every saved object of these types in the repo's fixture and archive files whose text mentions `marker`. */
export const corpusObjects = (types: readonly string[], marker: string): CorpusObject[] => {
  if (!cache) {
    const files: string[] = [];
    for (const root of ROOTS) walk(join(REPO_ROOT, root), files);
    cache = files
      .filter((file) => CORPUS_DIR.test(relative(REPO_ROOT, file)))
      .flatMap((file) => {
        const text = readFileSync(file, 'utf8');
        if (!/"(dashboard|map|visualization|lens)"/.test(text)) return [];
        return parseSequence(text).flatMap((value) => {
          const object = value as Partial<CorpusObject>;
          return typeof object.type === 'string' &&
            object.attributes &&
            typeof object.id === 'string'
            ? [
                {
                  file: relative(REPO_ROOT, file),
                  type: object.type,
                  id: object.id,
                  attributes: object.attributes as Record<string, unknown>,
                  references: object.references ?? [],
                },
              ]
            : [];
        });
      });
  }
  return cache.filter(
    ({ type, attributes }) => types.includes(type) && JSON.stringify(attributes).includes(marker)
  );
};
