/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { readFile } from 'fs/promises';

export enum EsqlDocEntry {
  syntax = 'syntax.md',
  examples = 'examples.md',
  tsQueries = 'ts_queries.md',
}

export interface EsqlLoadedDocumentation {
  getDocContent(entry: EsqlDocEntry): string;
}
let cachedDocumentation: Promise<EsqlLoadedDocumentation> | undefined;

export const _loadDocumentation = async (): Promise<EsqlLoadedDocumentation> => {
  const entries = Object.values(EsqlDocEntry);
  const contents = await Promise.all(entries.map((entry) => loadFile(entry)));

  const docs = entries.reduce((acc, entry, index) => {
    acc[entry] = contents[index];
    return acc;
  }, {} as Record<EsqlDocEntry, string>);

  return {
    getDocContent: (entry: EsqlDocEntry) => docs[entry],
  };
};

/**
 * Memoized variant of {@link _loadDocumentation}. Loads the documentation lazily
 * on first call and returns the cached promise on subsequent calls.
 */
export const loadDocumentation = (): Promise<EsqlLoadedDocumentation> => {
  if (!cachedDocumentation) {
    cachedDocumentation = _loadDocumentation();
  }
  return cachedDocumentation;
};

const loadFile = async (entry: EsqlDocEntry): Promise<string> => {
  return (await readFile(Path.join(__dirname, `./${entry}`))).toString('utf-8');
};
