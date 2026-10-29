/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import semver from 'semver';

const CONFIG_TYPE = 'config';
const DEFAULT_SPACE_ID = 'default';
const FIND_PAGE_SIZE = 1000;

interface ConfigDocument {
  id: string;
  namespaces?: string[];
  attributes: Record<string, unknown>;
}

// Each Kibana version creates its config document by copying the newest older one in the same
// space, so the newest document per space holds the value that space last used.
const findNewestConfigPerSpace = async (
  savedObjectsClient: SavedObjectsClientContract
): Promise<ConfigDocument[]> => {
  const newestBySpace = new Map<string, ConfigDocument>();
  for (let page = 1; ; page++) {
    const response = await savedObjectsClient.find<Record<string, unknown>>({
      type: CONFIG_TYPE,
      namespaces: ['*'],
      perPage: FIND_PAGE_SIZE,
      page,
    });
    for (const document of response.saved_objects) {
      const spaceId = document.namespaces?.[0] ?? DEFAULT_SPACE_ID;
      const newest = newestBySpace.get(spaceId);
      if (semver.valid(document.id) && (!newest || semver.gt(document.id, newest.id))) {
        newestBySpace.set(spaceId, document);
      }
    }
    if (page * FIND_PAGE_SIZE >= response.total) {
      return [...newestBySpace.values()];
    }
  }
};

/**
 * Turns the global setting on when tracking was enabled in at least one space before it became global.
 */
export const migrateTokenUsageTrackingToGlobal = async ({
  savedObjectsClient,
  globalUiSettingsClient,
  logger,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  globalUiSettingsClient: IUiSettingsClient;
  logger: Logger;
}): Promise<void> => {
  const globalUserProvided = await globalUiSettingsClient.getUserProvided();
  if (GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING in globalUserProvided) {
    return;
  }

  const configs = await findNewestConfigPerSpace(savedObjectsClient);
  const enabledInAnySpace = configs.some(
    ({ attributes }) => attributes[GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING] === true
  );
  if (!enabledInAnySpace) {
    return;
  }

  await globalUiSettingsClient.set(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, true);
  logger.info(
    'Enabled token usage tracking for all spaces because it was enabled in at least one space before it became a global setting'
  );
};
