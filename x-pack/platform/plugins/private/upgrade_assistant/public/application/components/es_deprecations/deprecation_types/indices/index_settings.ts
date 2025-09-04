/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Version } from '@kbn/upgrade-assistant-pkg-common';
export interface ParsedIndexName {
  cleanIndexName: string;
  baseName: string;
  newIndexName: string;
  cleanBaseName: string;
}

/**
 * Provides the assumed source of the index name stripping any prefixing
 * introduced by the upgrade assistant
 *
 * Examples:
 *   .reindex-v7-foo => .foo
 *   reindex-v7-foo => foo
 *
 * @param indexName
 */
export const sourceNameForIndex = (indexName: string, versionService: Version): string => {
  const matches = indexName.match(/^([\.])?(.*)$/) || [];
  const internal = matches[1] || '';
  const baseName = matches[2];

  // in 6.7+ we prepend to avoid conflicts with index patterns/templates/etc
  const reindexedMatcher = new RegExp(`reindexed-v${versionService.getPrevMajorVersion()}-`, 'g');

  const cleanBaseName = baseName.replace(reindexedMatcher, '');
  return `${internal}${cleanBaseName}`;
};

/**
 * Provides the index name to re-index into
 *
 * .foo -> .reindexed-v7-foo
 * foo => reindexed-v7-foo
 */
export const generateNewIndexName = (indexName: string, versionService: Version): string => {
  const sourceName = sourceNameForIndex(indexName, versionService);
  const currentVersion = `reindexed-v${versionService.getMajorVersion()}`;

  return indexName.startsWith('.')
    ? `.${currentVersion}-${sourceName.substr(1)}`
    : `${currentVersion}-${sourceName}`;
};
