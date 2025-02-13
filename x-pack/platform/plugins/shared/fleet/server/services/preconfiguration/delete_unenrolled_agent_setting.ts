/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { settingsService } from '..';
import type { FleetConfigType } from '../../config';

export function getPreconfiguredDeleteUnenrolledAgentsSettingFromConfig(
  config?: FleetConfigType
): boolean | undefined {
  return config.enableDeleteUnenrolledAgents;
}

export async function ensureDeleteUnenrolledAgentsSetting(
  soClient: SavedObjectsClientContract,
  enableDeleteUnenrolledAgents?: boolean
) {
  if (enableDeleteUnenrolledAgents === undefined) {
    const settings = await settingsService.getSettingsOrUndefined(soClient);
    if (!settings?.delete_unenrolled_agents?.is_preconfigured) {
      return;
    }
  }
  await settingsService.saveSettings(
    soClient,
    {
      delete_unenrolled_agents: {
        enabled: !!enableDeleteUnenrolledAgents,
        is_preconfigured: enableDeleteUnenrolledAgents !== undefined,
      },
    },
    { fromSetup: true }
  );
}
