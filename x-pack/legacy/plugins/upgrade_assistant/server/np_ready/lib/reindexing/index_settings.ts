/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flow, omit } from 'lodash';
import { ReindexWarning } from '../../../../common/types';
import { CURRENT_MAJOR_VERSION, PREV_MAJOR_VERSION } from '../../../../common/version';
import { isLegacyApmIndex } from '../apm';
import { FlatSettings, FlatSettingsWithTypeName } from './types';

export const DEFAULT_TYPE_NAME = '_doc';

export interface ParsedIndexName {
  cleanIndexName: string;
  baseName: string;
  newIndexName: string;
  cleanBaseName: string;
}

/**
 * Validates, and updates deprecated settings and mappings to be applied to the
 * new updated index.
 */
export const transformFlatSettings = (flatSettings: FlatSettings) => {
  const settings = transformSettings(flatSettings.settings);
  const mappings = transformMappings(flatSettings.mappings);

  return { settings, mappings };
};

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

  // in 5.6 the upgrade assistant appended to the index, in 6.7+ we prepend to
  // avoid conflicts with index patterns/templates/etc
  const reindexedMatcher = new RegExp(`(-reindexed-v5$|reindexed-v${PREV_MAJOR_VERSION}-)`, 'g');

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
  const currentVersion = `reindexed-v${CURRENT_MAJOR_VERSION}`;

  return indexName.startsWith('.')
    ? `.${currentVersion}-${sourceName.substr(1)}`
    : `${currentVersion}-${sourceName}`;
};

/**
 * Returns an array of warnings that should be displayed to user before reindexing begins.
 * @param flatSettings
 */
export const getReindexWarnings = (
  flatSettings: FlatSettingsWithTypeName,
  apmIndexPatterns: string[] = []
): ReindexWarning[] => {
  const indexName = flatSettings.settings['index.provided_name'];
  const typeName = Object.getOwnPropertyNames(flatSettings.mappings)[0];
  const apmReindexWarning = isLegacyApmIndex(
    indexName,
    apmIndexPatterns,
    flatSettings.mappings[typeName]
  );
  const typeNameWarning = usesCustomTypeName(flatSettings);

  const warnings = [
    [ReindexWarning.apmReindex, apmReindexWarning],
    [ReindexWarning.customTypeName, typeNameWarning],
  ] as Array<[ReindexWarning, boolean]>;

  return warnings.filter(([_, applies]) => applies).map(([warning, _]) => warning);
};

const usesCustomTypeName = (flatSettings: FlatSettingsWithTypeName) => {
  // In 7+ it's not possible to have more than one type anyways, so always grab the first
  // (and only) key.
  const typeName = Object.getOwnPropertyNames(flatSettings.mappings)[0];
  return typeName && typeName !== DEFAULT_TYPE_NAME;
};

const removeUnsettableSettings = (settings: FlatSettings['settings']) =>
  omit(settings, [
    'index.uuid',
    'index.blocks.write',
    'index.creation_date',
    'index.legacy',
    'index.mapping.single_type',
    'index.provided_name',
    'index.routing.allocation.initial_recovery._id',
    'index.version.created',
    'index.version.upgraded',
  ]);

// Use `flow` to pipe the settings through each function.
const transformSettings = flow(removeUnsettableSettings);

const updateFixableMappings = (mappings: FlatSettings['mappings']) => {
  // TODO: change type to _doc
  return mappings;
};

const transformMappings = flow(updateFixableMappings);
