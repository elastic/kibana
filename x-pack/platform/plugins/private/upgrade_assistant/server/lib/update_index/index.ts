/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { UpdateIndexOperation } from '../../../common/update_index';
import { getReindexWarnings } from '../reindexing/index_settings';
import { getRollupJobByIndexName } from '../rollup_job';

export interface UpdateIndexParams {
  esClient: ElasticsearchClient;
  index: string;
  operations: UpdateIndexOperation[];
  log: Logger;
}

/**
 * Perform some updates on a given index, to address compatibility issues.
 * @param esClient Elasticsearch client, to issue http calls to ES
 * @param index The index to update
 * @param operations The operations to perform on the specified index
 * @param logger Optional logger to log information
 */
export async function updateIndex({ esClient, index, operations, log }: UpdateIndexParams) {
  for (const operation of operations) {
    let res;

    switch (operation) {
      case 'blockWrite': {
        // stop related rollup job if it exists
        const rollupJob = await getRollupJobByIndexName(esClient, log, index);
        if (rollupJob) {
          await esClient.rollup.stopJob({ id: rollupJob, wait_for_completion: true });
        }

        res = await esClient.indices.addBlock({ index, block: 'write' });

        await removeDeprecatedSettings(esClient, index, log);
        break;
      }
      case 'unfreeze': {
        throw new Error('Unfreeze is not supported after 8.x');
      }
    }
    if (!res.acknowledged) {
      throw new Error(`Could not set apply ${operation} to ${index}.`);
    }
  }
}

/**
 * Removes any deprecated index settings
 * @param esClient Elasticsearch client
 * @param index The index to update
 * @param logger Optional logger to log information
 */
async function removeDeprecatedSettings(
  esClient: ElasticsearchClient,
  index: string,
  log?: Logger
) {
  try {
    // Get index settings
    const indexSettings = await esClient.indices.get({
      index,
      flat_settings: true,
    });

    // Get the warnings for this index to check for deprecated settings
    const flatSettings = indexSettings[index] || {};
    const warnings = flatSettings ? getReindexWarnings(flatSettings) : undefined;
    const indexSettingsWarning = warnings?.find(
      (warning) =>
        warning.warningType === 'indexSetting' &&
        (warning.flow === 'reindex' || warning.flow === 'all')
    );

    // If there are deprecated settings, set them to null to remove them
    if (indexSettingsWarning?.meta?.deprecatedSettings) {
      const deprecatedSettings = indexSettingsWarning.meta.deprecatedSettings as string[];
      const settingsToApply: Record<string, null> = {};

      for (const setting of deprecatedSettings) {
        settingsToApply[setting] = null;
      }

      if (Object.keys(settingsToApply).length > 0) {
        log?.info(
          `Removing deprecated settings ${Object.keys(settingsToApply).join(
            ', '
          )} from index ${index}`
        );

        await esClient.indices.putSettings({
          index,
          settings: settingsToApply,
          // Any static settings that would ordinarily only be updated on closed indices
          // will be updated by automatically closing and reopening the affected indices.
          // @ts-ignore - This is not in the ES types, but it is a valid option
          reopen: true,
        });
      }
    }
  } catch (error) {
    // Log error but don't fail the operation since removing deprecated settings
    // is secondary to the main operation
    log?.warn(`Failed to remove deprecated settings from ${index}: ${error}`);
  }
}
