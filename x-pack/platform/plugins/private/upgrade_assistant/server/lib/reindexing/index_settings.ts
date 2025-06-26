/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexWarning } from '../../../common/types';
import { versionService } from '../version';
import { FlatSettings } from './types';
export interface ParsedIndexName {
  cleanIndexName: string;
  baseName: string;
  newIndexName: string;
  cleanBaseName: string;
}
/**
 * An array of deprecated index settings specific to 7.0 --> 8.0 upgrade
 * This excludes the deprecated translog retention settings
 * as these are only marked as deprecated if soft deletes is enabled
 * See logic in getDeprecatedSettingWarning() for more details
 */
const deprecatedSettings = [
  'index.force_memory_term_dictionary',
  'index.max_adjacency_matrix_filters',
  'index.soft_deletes.enabled',
];

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
export const sourceNameForIndex = (indexName: string): string => {
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
export const generateNewIndexName = (indexName: string): string => {
  const sourceName = sourceNameForIndex(indexName);
  const currentVersion = `reindexed-v${versionService.getMajorVersion()}`;

  return indexName.startsWith('.')
    ? `.${currentVersion}-${sourceName.substr(1)}`
    : `${currentVersion}-${sourceName}`;
};

export const getDeprecatedSettingWarning = (
  flatSettings: FlatSettings
): IndexWarning | undefined => {
  const { settings } = flatSettings;

  const deprecatedSettingsInUse = Object.keys(settings || {}).filter((setting) => {
    return deprecatedSettings.indexOf(setting) > -1;
  });

  // Translog settings are only marked as deprecated if soft deletes is enabled
  // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
  if (settings['index.soft_deletes.enabled'] === 'true') {
    // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
    if (settings['index.translog.retention.size']) {
      deprecatedSettingsInUse.push('index.translog.retention.size');
    }

    // @ts-expect-error @elastic/elasticsearch doesn't declare such a setting
    if (settings['index.translog.retention.age']) {
      deprecatedSettingsInUse.push('index.translog.retention.age');
    }
  }

  if (deprecatedSettingsInUse.length) {
    return {
      flow: 'all',
      warningType: 'indexSetting',
      meta: {
        deprecatedSettings: deprecatedSettingsInUse,
      },
    };
  }
};

/**
 * Returns an array of warnings that should be displayed to user before reindexing begins.
 * @param flatSettings
 */
export const getReindexWarnings = (flatSettings: FlatSettings): IndexWarning[] => {
  const warnings = [] as IndexWarning[];

  if (versionService.getMajorVersion() === 8) {
    const deprecatedSettingWarning = getDeprecatedSettingWarning(flatSettings);

    if (deprecatedSettingWarning) {
      warnings.push(deprecatedSettingWarning);
    }
  }

  return warnings;
};
