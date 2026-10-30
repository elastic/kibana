/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  CASES_SPACE_SETTINGS_ID,
  CASES_SPACE_SETTINGS_SAVED_OBJECT,
} from '../../../common/constants';
import type {
  CaseStatusDefinition,
  CasesSpaceSettings,
} from '../../../common/types/domain/space_settings/v1';
import { getEffectiveStatuses } from '../../../common/utils/statuses';

/** Reads and writes the single Cases settings document of the request's space. */
export class SpaceSettingsService {
  constructor(
    private readonly dependencies: { unsecuredSavedObjectsClient: SavedObjectsClientContract }
  ) {}

  /** The saved settings, or `null` when the space never saved any. */
  async get(): Promise<CasesSpaceSettings | null> {
    try {
      const { attributes } =
        await this.dependencies.unsecuredSavedObjectsClient.get<CasesSpaceSettings>(
          CASES_SPACE_SETTINGS_SAVED_OBJECT,
          CASES_SPACE_SETTINGS_ID
        );
      return attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  /** The space's statuses, falling back to the seeded defaults. */
  async getStatuses(): Promise<CaseStatusDefinition[]> {
    return getEffectiveStatuses(await this.get());
  }

  async put(settings: CasesSpaceSettings): Promise<CasesSpaceSettings> {
    const { attributes } =
      await this.dependencies.unsecuredSavedObjectsClient.create<CasesSpaceSettings>(
        CASES_SPACE_SETTINGS_SAVED_OBJECT,
        settings,
        { id: CASES_SPACE_SETTINGS_ID, overwrite: true, refresh: false }
      );
    return attributes;
  }
}
