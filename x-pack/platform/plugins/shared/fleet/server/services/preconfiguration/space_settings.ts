/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import deepEqual from 'fast-deep-equal';

import { appContextService } from '..';
import { SO_SEARCH_LIMIT, SPACE_SETTINGS_SAVED_OBJECT_TYPE } from '../../constants';
import type { PreconfiguredSpaceSettingsSchema, SpaceSettingsSOAttributes } from '../../types';
import { saveSpaceSettings } from '../spaces/space_settings';

export async function ensureSpaceSettings(
  configSpaceSettingsArray: TypeOf<typeof PreconfiguredSpaceSettingsSchema>
) {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

  // Get all existing config space
  const existingConfigSpaceSettingsSOs = await soClient.find<SpaceSettingsSOAttributes>({
    type: SPACE_SETTINGS_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
    namespaces: ['*'],
  });

  const existingConfigSpaceSettingsSOMap = existingConfigSpaceSettingsSOs.saved_objects.reduce(
    (acc, so) => {
      acc.set(so.namespaces?.[0] ?? DEFAULT_SPACE_ID, so);

      return acc;
    },
    new Map<string, SavedObjectsFindResult<SpaceSettingsSOAttributes>>()
  );

  for (const configSpaceSettings of configSpaceSettingsArray) {
    // Check for existing
    const existingConfigSpaceSettingsSO = existingConfigSpaceSettingsSOMap.get(
      configSpaceSettings.space_id
    );

    if (!existingConfigSpaceSettingsSO) {
      await saveSpaceSettings({
        spaceId: configSpaceSettings.space_id,
        settings: {
          allowed_namespace_prefixes: configSpaceSettings.allowed_namespace_prefixes,
          managed_by: 'kibana_config',
        },
        managedBy: 'kibana_config',
      });
    } else if (
      !deepEqual(
        existingConfigSpaceSettingsSO.attributes.allowed_namespace_prefixes,
        configSpaceSettings.allowed_namespace_prefixes
      ) ||
      !existingConfigSpaceSettingsSO.attributes.managed_by
    ) {
      await saveSpaceSettings({
        spaceId: configSpaceSettings.space_id,
        settings: {
          allowed_namespace_prefixes: configSpaceSettings.allowed_namespace_prefixes,
          managed_by: 'kibana_config',
        },
        managedBy: 'kibana_config',
      });
    }
  }

  for (const spaceId of existingConfigSpaceSettingsSOMap.keys()) {
    if (
      !configSpaceSettingsArray.some(
        (config) =>
          config.space_id === spaceId &&
          existingConfigSpaceSettingsSOMap.get(spaceId)?.attributes?.managed_by === 'kibana_config'
      )
    ) {
      await saveSpaceSettings({
        spaceId,
        settings: {
          managed_by: null,
        },
        managedBy: 'kibana_config',
      });
    }
  }
}
