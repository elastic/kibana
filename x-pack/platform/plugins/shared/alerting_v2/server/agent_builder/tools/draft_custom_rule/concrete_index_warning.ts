/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';

const BACKING_INDEX_PREFIX = '.ds-';
// Data stream backing indices are named `.ds-<data-stream>-<yyyy.MM.dd>-<generation>`.
// The date + 6-digit generation pair is specific enough to also recognise the same name
// without its `.ds-` prefix (e.g. as users and tools often write it), whereas a bare
// `-NNNNNN` or `-yyyy.MM.dd` suffix is also a common user-chosen name.
const GENERATION_SUFFIX = /-\d{4}\.\d{2}\.\d{2}-\d{6}$/;

export interface ConcreteIndexMatch {
  /** Source as written in the query (may include a CCS `remote:` prefix). */
  index: string;
  /** Name without the `.ds-` prefix and generation suffix, with the CCS prefix preserved. */
  baseName: string;
}

const stripRemoteClusterPrefix = (source: string): { remote: string; local: string } => {
  const colonIndex = source.indexOf(':');
  return colonIndex === -1
    ? { remote: '', local: source }
    : { remote: source.slice(0, colonIndex + 1), local: source.slice(colonIndex + 1) };
};

/**
 * Returns the `FROM`/`TS` sources of the query that are data stream backing
 * indices: any `.ds-` name, or a name ending in the `-yyyy.MM.dd-NNNNNN`
 * generation suffix. Both are fixed by Elasticsearch, so user-chosen names such
 * as `orders-000123` or `logstash-2026.06.11` are not matched.
 */
export const findBackingIndices = (esqlQuery: string): ConcreteIndexMatch[] =>
  getIndexPatternFromESQLQuery(esqlQuery)
    .split(',')
    .map((source) => source.trim())
    .flatMap((source) => {
      const { remote, local } = stripRemoteClusterPrefix(source);
      // A wildcard over backing indices still matches the ones created by future rollovers.
      if (/[*?]/.test(local)) {
        return [];
      }
      const hasPrefix = local.startsWith(BACKING_INDEX_PREFIX);
      if (!hasPrefix && !GENERATION_SUFFIX.test(local)) {
        return [];
      }
      const baseName = (hasPrefix ? local.slice(BACKING_INDEX_PREFIX.length) : local).replace(
        GENERATION_SUFFIX,
        ''
      );
      return [{ index: source, baseName: `${remote}${baseName}` }];
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
    .map(({ index, baseName }) => `\`${index}\` (base name \`${baseName}\`)`)
    .join(', ');
  return (
    `${queryName} targets a rollover generation index: ${details}. Generation indices change on ` +
    `every rollover, so the rule will stop matching new data. If the user explicitly asked for ` +
    `this index, keep it and tell them about the risk. Otherwise call the operation again using ` +
    `the base name when it is a data stream or alias, or a wildcard pattern such as ` +
    `\`<base name>-*\` instead.`
  );
};

/**
 * For sources the rule already had: the user did not choose them in this edit, so
 * the model must not be steered into changing the rule's data scope.
 */
export const formatInheritedBackingIndexWarning = (
  matches: ConcreteIndexMatch[],
  queryName: string = 'The query'
): string => {
  const details = matches
    .map(({ index, baseName }) => `\`${index}\` (base name \`${baseName}\`)`)
    .join(', ');
  return (
    `${queryName} still targets a rollover generation index the rule already used: ${details}. ` +
    `Leave it unchanged unless the user asks to change it. If it is relevant to the request, ` +
    `mention that the rule may stop matching new data after a rollover.`
  );
};
