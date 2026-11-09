/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { readFile } from 'fs/promises';
import { promqlFunctionDefinitions } from '@elastic/esql-definitions/promql-functions';
import { assetOverridesEnabled, readAssetOverride } from '../harness_assets';
import type { HarnessAssetPath } from '../harness_assets';

export enum EsqlDocEntry {
  syntax = 'syntax.md',
  examples = 'examples.md',
  tsQueries = 'ts_queries.md',
  promqlQueries = 'promql_queries.md',
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
  // Memoisation is skipped while asset overrides are active, so an optimization round can swap
  // the corpus between candidates without restarting Kibana.
  if (assetOverridesEnabled()) {
    return _loadDocumentation();
  }
  if (!cachedDocumentation) {
    cachedDocumentation = _loadDocumentation();
  }
  return cachedDocumentation;
};

/** Placeholder in `promql_queries.md`, replaced with the PromQL functions that ES|QL supports. */
export const PROMQL_FUNCTIONS_PLACEHOLDER = '{{promql_functions}}';

// derived from the generated PromQL function definitions, which are synced from Elasticsearch,
// so that the supported functions do not have to be maintained by hand here
const getPromqlFunctionNames = (): string =>
  promqlFunctionDefinitions
    .map(({ name }) => `\`${name}\``)
    .sort()
    .join(', ');

// notes for maintainers, which are not meant for the model
const HTML_COMMENT = /^[ \t]*<!--[\s\S]*?-->[ \t]*\n?/gm;

const loadFile = async (entry: EsqlDocEntry): Promise<string> => {
  // The documentation corpus is the largest thing the model reads, which makes it the most
  // valuable surface for the offline optimization loop — so each file can be replaced from the
  // asset override directory. Production never sets that variable.
  const override = readAssetOverride(`documentation/${entry}` as HarnessAssetPath);
  const raw = override ?? (await readFile(Path.join(__dirname, `./${entry}`))).toString('utf-8');
  const content = raw.replace(HTML_COMMENT, '');
  return entry === EsqlDocEntry.promqlQueries
    ? content.replace(PROMQL_FUNCTIONS_PLACEHOLDER, getPromqlFunctionNames())
    : content;
};
