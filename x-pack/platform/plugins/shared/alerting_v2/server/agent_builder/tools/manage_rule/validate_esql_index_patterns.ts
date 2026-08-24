/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';

/**
 * Concrete data-stream backing index or ILM/time-series generation suffixes.
 * Matched against the index name after stripping an optional CCS `remote:` prefix.
 *
 * - `.ds-...` — data stream backing index
 * - `-yyyy.MM.dd-NNNNNN` — date + 6-digit generation
 * - `-yyyy.MM.dd` — classic daily index
 * - `-NNNNNN` — ILM alias rollover generation
 */
const DATE_AND_GENERATION_SUFFIX = /-\d{4}\.\d{2}\.\d{2}-\d{6}$/;
const DAILY_DATE_SUFFIX = /-\d{4}\.\d{2}\.\d{2}$/;
const ILM_GENERATION_SUFFIX = /-\d{6}$/;

export interface ConcreteGenerationIndexMatch {
  /** Original index name as it appeared in the query (may include CCS prefix). */
  index: string;
  /** Suggested wildcard pattern that survives rollover. */
  suggestion: string;
}

export interface ConcreteGenerationIndexResult {
  matches: ConcreteGenerationIndexMatch[];
}

const stripRemoteClusterPrefix = (index: string): { remote?: string; local: string } => {
  const colonIndex = index.indexOf(':');
  if (colonIndex === -1) {
    return { local: index };
  }
  return {
    remote: index.slice(0, colonIndex),
    local: index.slice(colonIndex + 1),
  };
};

const isConcreteGenerationIndex = (localName: string): boolean => {
  if (localName.includes('*') || localName.includes('?')) {
    return false;
  }
  if (localName.startsWith('.ds-')) {
    return true;
  }
  return (
    DATE_AND_GENERATION_SUFFIX.test(localName) ||
    DAILY_DATE_SUFFIX.test(localName) ||
    ILM_GENERATION_SUFFIX.test(localName)
  );
};

/**
 * Derives a wildcard index pattern from a concrete generation index name.
 * Preserves an optional CCS remote cluster prefix.
 */
export const suggestWildcardPattern = (index: string): string => {
  const { remote, local } = stripRemoteClusterPrefix(index);
  let base = local.startsWith('.ds-') ? local.slice('.ds-'.length) : local;

  if (DATE_AND_GENERATION_SUFFIX.test(base)) {
    base = base.replace(DATE_AND_GENERATION_SUFFIX, '');
  } else if (DAILY_DATE_SUFFIX.test(base)) {
    base = base.replace(DAILY_DATE_SUFFIX, '');
  } else if (ILM_GENERATION_SUFFIX.test(base)) {
    base = base.replace(ILM_GENERATION_SUFFIX, '');
  }

  const pattern = `${base}-*`;
  return remote ? `${remote}:${pattern}` : pattern;
};

/**
 * Parses the ES|QL root query's FROM/TS sources and returns any that look like
 * concrete data-stream backing or ILM/time-series generation indices, along with
 * suggested wildcard replacements for error/warning messages.
 */
export const findConcreteGenerationIndices = (esqlQuery: string): ConcreteGenerationIndexResult => {
  const indexPattern = getIndexPatternFromESQLQuery(esqlQuery);
  if (!indexPattern) {
    return { matches: [] };
  }

  const matches: ConcreteGenerationIndexMatch[] = [];
  for (const index of indexPattern.split(',')) {
    const trimmed = index.trim();
    if (!trimmed) {
      continue;
    }
    const { local } = stripRemoteClusterPrefix(trimmed);
    if (isConcreteGenerationIndex(local)) {
      matches.push({
        index: trimmed,
        suggestion: suggestWildcardPattern(trimmed),
      });
    }
  }

  return { matches };
};

export const formatConcreteGenerationWarning = (
  matches: ConcreteGenerationIndexMatch[]
): string => {
  const details = matches
    .map(({ index, suggestion }) => `\`${index}\` (consider \`${suggestion}\`)`)
    .join(', ');
  return (
    `This query targets a concrete generation index (${details}). ` +
    `Consider using a wildcard pattern so the rule survives data stream or ILM rollovers.`
  );
};

export const formatConcreteGenerationError = (matches: ConcreteGenerationIndexMatch[]): string => {
  const details = matches
    .map(({ index, suggestion }) => `\`${index}\` — use \`${suggestion}\` instead`)
    .join('; ');
  return (
    `Query targets a concrete generation index that will break on rollover: ${details}. ` +
    `Use a wildcard index pattern in the FROM clause.`
  );
};
