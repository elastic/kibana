/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  BOOST_PROTOTYPE_SETTINGS_SAVED_OBJECT_ID,
  BOOST_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type { PrototypeSettings } from '../../common/prototype_settings';
import { DEFAULT_PROTOTYPE_SETTINGS } from '../../common/prototype_settings';

// How the switches are saved, beside the boost configuration in the same saved object type.
interface PrototypeSettingsAttributes extends PrototypeSettings {
  kind: 'prototype_settings';
}

/** The prototype menu's switches, which are off until someone turns them on. */
export const getPrototypeSettings = async (
  client: SavedObjectsClientContract
): Promise<PrototypeSettings> => {
  try {
    const { attributes } = await client.get<Partial<PrototypeSettings>>(
      BOOST_SAVED_OBJECT_TYPE,
      BOOST_PROTOTYPE_SETTINGS_SAVED_OBJECT_ID
    );
    return {
      shows_estimates: attributes.shows_estimates ?? DEFAULT_PROTOTYPE_SETTINGS.shows_estimates,
      allows_multiple_targets:
        attributes.allows_multiple_targets ?? DEFAULT_PROTOTYPE_SETTINGS.allows_multiple_targets,
    };
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return { ...DEFAULT_PROTOTYPE_SETTINGS };
    }
    throw error;
  }
};

/**
 * Changes some of the switches, for everyone, and returns all of them. Only the changes are written,
 * so changes made at the same time to different switches all apply.
 */
export const updatePrototypeSettings = async (
  client: SavedObjectsClientContract,
  changes: Partial<PrototypeSettings>
): Promise<PrototypeSettings> => {
  await client.update<PrototypeSettingsAttributes>(
    BOOST_SAVED_OBJECT_TYPE,
    BOOST_PROTOTYPE_SETTINGS_SAVED_OBJECT_ID,
    changes,
    {
      upsert: { kind: 'prototype_settings', ...DEFAULT_PROTOTYPE_SETTINGS, ...changes },
      refresh: 'wait_for',
    }
  );
  return getPrototypeSettings(client);
};

/** Turns every switch back off. */
export const resetPrototypeSettings = async (client: SavedObjectsClientContract): Promise<void> => {
  try {
    await client.delete(BOOST_SAVED_OBJECT_TYPE, BOOST_PROTOTYPE_SETTINGS_SAVED_OBJECT_ID);
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw error;
    }
  }
};
