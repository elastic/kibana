/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlatSettings, IndexWarning } from './types';

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
export const getReindexWarnings = (
  flatSettings: FlatSettings,
  kibanaMajorVersion: number
): IndexWarning[] => {
  const warnings = [] as IndexWarning[];

  if (kibanaMajorVersion === 8) {
    const deprecatedSettingWarning = getDeprecatedSettingWarning(flatSettings);

    if (deprecatedSettingWarning) {
      warnings.push(deprecatedSettingWarning);
    }
  }

  return warnings;
};
