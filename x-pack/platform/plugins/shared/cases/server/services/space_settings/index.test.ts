/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { CASES_SPACE_SETTINGS_SAVED_OBJECT } from '../../../common/constants';
import type { CasesSpaceSettings } from '../../../common/types/domain/space_settings/v1';
import { DEFAULT_CASE_STATUSES } from '../../../common/utils/statuses';
import { SpaceSettingsService, getSpaceSettingsId } from '.';

const settings: CasesSpaceSettings = {
  statuses: [
    ...DEFAULT_CASE_STATUSES,
    {
      key: 'triage',
      label: 'Triage',
      color: 'accent',
      category: 'not_started',
      order: 3,
      isDefault: false,
      disabled: false,
    },
  ],
};

const savedObject = (attributes: CasesSpaceSettings) => ({
  id: 'cases-space-settings-default',
  type: CASES_SPACE_SETTINGS_SAVED_OBJECT,
  attributes,
  references: [],
});

describe('SpaceSettingsService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const service = new SpaceSettingsService({ unsecuredSavedObjectsClient, spaceId: 'default' });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns null when the space never saved settings', async () => {
    unsecuredSavedObjectsClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        CASES_SPACE_SETTINGS_SAVED_OBJECT,
        'cases-space-settings-default'
      )
    );

    await expect(service.get()).resolves.toBeNull();
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(
      CASES_SPACE_SETTINGS_SAVED_OBJECT,
      'cases-space-settings-default'
    );
  });

  it('falls back to the default statuses when nothing is saved', async () => {
    unsecuredSavedObjectsClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        CASES_SPACE_SETTINGS_SAVED_OBJECT,
        'cases-space-settings-default'
      )
    );

    await expect(service.getStatuses()).resolves.toEqual([...DEFAULT_CASE_STATUSES]);
  });

  it('returns the saved statuses', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValue(savedObject(settings));

    await expect(service.getStatuses()).resolves.toEqual(settings.statuses);
  });

  it('rethrows other errors', async () => {
    unsecuredSavedObjectsClient.get.mockRejectedValue(new Error('boom'));

    await expect(service.get()).rejects.toThrow('boom');
  });

  it('overwrites the single settings document of the space', async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValue(savedObject(settings));

    await expect(service.put(settings)).resolves.toEqual(settings);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CASES_SPACE_SETTINGS_SAVED_OBJECT,
      settings,
      { id: 'cases-space-settings-default', overwrite: true, refresh: false }
    );
  });
});

describe('getSpaceSettingsId', () => {
  it('gives every space its own settings document', () => {
    expect(getSpaceSettingsId('default')).not.toBe(getSpaceSettingsId('security-view'));
  });
});
