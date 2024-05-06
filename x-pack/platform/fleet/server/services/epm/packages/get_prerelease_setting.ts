/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { appContextService } from '../../app_context';
import { getSettings } from '../../settings';

export async function getPrereleaseFromSettings(
  savedObjectsClient: SavedObjectsClientContract
): Promise<boolean> {
  let prerelease: boolean = false;
  try {
    ({ prerelease_integrations_enabled: prerelease } = await getSettings(savedObjectsClient));
  } catch (err) {
    appContextService
      .getLogger()
      .warn('Error while trying to load prerelease flag from settings, defaulting to false', err);
  }
  return prerelease;
}
