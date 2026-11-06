/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';

const SOURCE_COMMAND = /^\s*(?:FROM|TS)\s+([^|]+)/i;
const GENERATION_SUFFIX = /-\d{4}\.\d{2}\.\d{2}-\d{6}$/;

/**
 * Returns the sources of the query's leading `FROM`/`TS` command, without any
 * `METADATA` clause or cross-cluster prefix.
 */
const getSources = (esql: string): string[] => {
  const [, sources = ''] = SOURCE_COMMAND.exec(esql) ?? [];
  return sources
    .replace(/\bMETADATA\b[\s\S]*$/i, '')
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean)
    .map((source) => source.replace(/["`]/g, ''))
    .map((source) => source.slice(source.indexOf(':') + 1));
};

/**
 * Asserts that no source of the query is a rollover generation index: a `.ds-`
 * backing index or a name ending in `-yyyy.MM.dd-NNNNNN`. Wildcard patterns and
 * data stream names pass, since both survive rollovers.
 */
export const assertNoGenerationIndex = (esql: string): void => {
  const sources = getSources(esql);
  expect(sources.length, `No FROM/TS source found in: ${esql}`).toBeGreaterThan(0);
  for (const source of sources) {
    const isGenerationIndex =
      !/[*?]/.test(source) && (source.startsWith('.ds-') || GENERATION_SUFFIX.test(source));
    expect(isGenerationIndex, `"${source}" is a rollover generation index`).toBe(false);
  }
};
