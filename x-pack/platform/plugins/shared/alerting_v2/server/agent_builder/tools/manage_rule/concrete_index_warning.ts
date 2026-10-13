/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';

const BACKING_INDEX_PREFIX = '.ds-';
// Data stream backing indices are named `.ds-<data-stream>-<yyyy.MM.dd>-<generation>`.
const BACKING_INDEX_SUFFIX = /-\d{4}\.\d{2}\.\d{2}-\d{6}$/;

export interface ConcreteIndexMatch {
  /** Source as written in the query (may include a CCS `remote:` prefix). */
  index: string;
  /** Data stream the backing index belongs to, with the CCS prefix preserved. */
  dataStream: string;
}

const stripRemoteClusterPrefix = (source: string): { remote: string; local: string } => {
  const colonIndex = source.indexOf(':');
  return colonIndex === -1
    ? { remote: '', local: source }
    : { remote: source.slice(0, colonIndex + 1), local: source.slice(colonIndex + 1) };
};

/**
 * Returns the `FROM`/`TS` sources of the query that are data stream backing
 * indices. Only the `.ds-` naming is matched: it is fixed by Elasticsearch, so
 * there are no false positives on user-chosen names such as `orders-202401`.
 */
export const findBackingIndices = (esqlQuery: string): ConcreteIndexMatch[] =>
  getIndexPatternFromESQLQuery(esqlQuery)
    .split(',')
    .map((source) => source.trim())
    .flatMap((source) => {
      const { remote, local } = stripRemoteClusterPrefix(source);
      // A wildcard over backing indices still matches the ones created by future rollovers.
      if (!local.startsWith(BACKING_INDEX_PREFIX) || /[*?]/.test(local)) {
        return [];
      }
      const dataStream = local.slice(BACKING_INDEX_PREFIX.length).replace(BACKING_INDEX_SUFFIX, '');
      return [{ index: source, dataStream: `${remote}${dataStream}` }];
    });

/**
 * Worded as an instruction for the model: the code cannot tell whether the user
 * asked for this index on purpose, the model can.
 */
export const formatBackingIndexWarning = (
  matches: ConcreteIndexMatch[],
  queryName: string = 'The query'
): string => {
  const details = matches
    .map(({ index, dataStream }) => `\`${index}\` (data stream \`${dataStream}\`)`)
    .join(', ');
  return (
    `${queryName} targets a data stream backing index: ${details}. Backing indices change on ` +
    `every rollover, so the rule will stop matching new data. If the user explicitly asked for ` +
    `this index, keep it and tell them about the risk. Otherwise call the operation again using ` +
    `the data stream name or a wildcard pattern instead.`
  );
};
