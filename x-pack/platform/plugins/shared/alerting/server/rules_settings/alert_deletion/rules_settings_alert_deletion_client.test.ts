/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RulesSettings } from '../../../common';
import {
  RULES_SETTINGS_FEATURE_ID,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID,
  DEFAULT_ALERT_DELETION_SETTINGS,
} from '../../../common';
import type { RulesSettingsAlertDeletionClientConstructorOptions } from './rules_settings_alert_deletion_client';
import { RulesSettingsAlertDeletionClient } from './rules_settings_alert_deletion_client';

const mockDateString = '2019-02-12T21:01:22.479Z';

const savedObjectsClient = savedObjectsClientMock.create();

const getMockRulesSettings = (): RulesSettings => {
  return {
    alertDeletion: {
      isActiveAlertsDeletionEnabled: DEFAULT_ALERT_DELETION_SETTINGS.isActiveAlertsDeletionEnabled,
      isInactiveAlertsDeletionEnabled:
        DEFAULT_ALERT_DELETION_SETTINGS.isInactiveAlertsDeletionEnabled,
      activeAlertsDeletionThreshold: DEFAULT_ALERT_DELETION_SETTINGS.activeAlertsDeletionThreshold,
      inactiveAlertsDeletionThreshold:
        DEFAULT_ALERT_DELETION_SETTINGS.inactiveAlertsDeletionThreshold,
      createdBy: 'test name',
      updatedBy: 'test name',
      createdAt: '2023-03-24T00:00:00.000Z',
      updatedAt: '2023-03-24T00:00:00.000Z',
    },
  };
};

const rulesSettingsAlertDeletionClientParams: jest.Mocked<RulesSettingsAlertDeletionClientConstructorOptions> =
  {
    logger: loggingSystemMock.create().get(),
    getModificationMetadata: jest.fn(),
    savedObjectsClient,
  };

const updatedMetadata = {
  createdAt: '2023-03-26T00:00:00.000Z',
  updatedAt: '2023-03-26T00:00:00.000Z',
  createdBy: 'updated-user',
  updatedBy: 'updated-user',
};

describe('RulesSettingsAlertDeletionClient', () => {
  beforeEach(() => {
    rulesSettingsAlertDeletionClientParams.getModificationMetadata.mockResolvedValue(
      updatedMetadata
    );
    savedObjectsClient.get.mockResolvedValue({
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: getMockRulesSettings(),
      references: [],
      version: '123',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(mockDateString));
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('can get alert deletion settings', async () => {
    const client = new RulesSettingsAlertDeletionClient(rulesSettingsAlertDeletionClientParams);
    const result = await client.get();

    expect(result).toEqual(
      expect.objectContaining({
        isActiveAlertsDeletionEnabled:
          DEFAULT_ALERT_DELETION_SETTINGS.isActiveAlertsDeletionEnabled,
        isInactiveAlertsDeletionEnabled:
          DEFAULT_ALERT_DELETION_SETTINGS.isInactiveAlertsDeletionEnabled,
        activeAlertsDeletionThreshold:
          DEFAULT_ALERT_DELETION_SETTINGS.activeAlertsDeletionThreshold,
        inactiveAlertsDeletionThreshold:
          DEFAULT_ALERT_DELETION_SETTINGS.inactiveAlertsDeletionThreshold,
        createdBy: 'test name',
        updatedBy: 'test name',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  test('can update alert deletion settings', async () => {
    const client = new RulesSettingsAlertDeletionClient(rulesSettingsAlertDeletionClientParams);

    const mockResolve = {
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: getMockRulesSettings(),
      references: [],
      version: '123',
    };

    savedObjectsClient.update.mockResolvedValueOnce({
      ...mockResolve,
      attributes: {
        alertDeletion: {
          ...mockResolve.attributes.alertDeletion,
          isActiveAlertsDeletionEnabled: false,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 1,
          inactiveAlertsDeletionThreshold: 90,
        },
      },
    });

    const result = await client.update({
      isActiveAlertsDeletionEnabled: false,
      isInactiveAlertsDeletionEnabled: true,
      activeAlertsDeletionThreshold: 1,
      inactiveAlertsDeletionThreshold: 90,
    });

    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID,
      {
        alertDeletion: expect.objectContaining({
          isActiveAlertsDeletionEnabled: false,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 1,
          inactiveAlertsDeletionThreshold: 90,
          updatedAt: '2023-03-26T00:00:00.000Z',
          updatedBy: 'updated-user',
          createdBy: 'test name',
          createdAt: '2023-03-24T00:00:00.000Z',
        }),
      },
      { version: '123' }
    );

    expect(result).toEqual(
      expect.objectContaining({
        isActiveAlertsDeletionEnabled: false,
        isInactiveAlertsDeletionEnabled: true,
        activeAlertsDeletionThreshold: 1,
        inactiveAlertsDeletionThreshold: 90,
        createdBy: 'test name',
        updatedBy: 'test name',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  test('throws if savedObjectsClient failed to update', async () => {
    const client = new RulesSettingsAlertDeletionClient(rulesSettingsAlertDeletionClientParams);
    savedObjectsClient.update.mockRejectedValueOnce(new Error('failed!!'));

    await expect(
      client.update({
        isActiveAlertsDeletionEnabled: false,
        isInactiveAlertsDeletionEnabled: true,
        activeAlertsDeletionThreshold: 1,
        inactiveAlertsDeletionThreshold: 90,
      })
    ).rejects.toThrowError(
      'savedObjectsClient errored trying to update alert deletion settings: failed!!'
    );
  });

  test('can create a new alert deletion settings saved object', async () => {
    rulesSettingsAlertDeletionClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsAlertDeletionClient(rulesSettingsAlertDeletionClientParams);
    const mockAttributes = getMockRulesSettings();

    savedObjectsClient.create.mockResolvedValueOnce({
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: mockAttributes,
      references: [],
    });
    // @ts-expect-error access private method
    const result = await client.createSettings();

    expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      {
        alertDeletion: expect.objectContaining({
          isActiveAlertsDeletionEnabled: false,
          isInactiveAlertsDeletionEnabled: false,
          activeAlertsDeletionThreshold: 90,
          inactiveAlertsDeletionThreshold: 90,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      {
        id: RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID,
        overwrite: true,
      }
    );
    expect(result.attributes).toEqual(mockAttributes);
  });

  test('can get existing alert deletion settings saved object', async () => {
    const client = new RulesSettingsAlertDeletionClient(rulesSettingsAlertDeletionClientParams);
    const mockAttributes = getMockRulesSettings();

    savedObjectsClient.get.mockResolvedValueOnce({
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: mockAttributes,
      references: [],
    });
    // @ts-expect-error access private method
    const result = await client.getSettings();
    expect(result.attributes).toEqual(mockAttributes);
  });

  test('throws if there is no existing saved object to get', async () => {
    const client = new RulesSettingsAlertDeletionClient(rulesSettingsAlertDeletionClientParams);

    savedObjectsClient.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID
      )
    );
    await expect(client.get()).rejects.toThrowError();
  });

  test('can persist query delay settings when saved object already exists', async () => {
    rulesSettingsAlertDeletionClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsAlertDeletionClient(rulesSettingsAlertDeletionClientParams);
    const mockAttributes = getMockRulesSettings();

    savedObjectsClient.get.mockResolvedValueOnce({
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: mockAttributes,
      references: [],
    });

    const result = await client.get();

    expect(savedObjectsClient.get).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID
    );
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
    expect(result).toEqual(mockAttributes.alertDeletion);
  });

  test('can update alert deletion settings when saved object does not exist', async () => {
    rulesSettingsAlertDeletionClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsAlertDeletionClient(rulesSettingsAlertDeletionClientParams);
    const mockAttributes = getMockRulesSettings();

    savedObjectsClient.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID
      )
    );

    const mockResolve = {
      id: RULES_SETTINGS_FEATURE_ID,
      type: RULES_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: mockAttributes,
      references: [],
      version: '123',
    };

    savedObjectsClient.create.mockResolvedValueOnce(mockResolve);
    savedObjectsClient.update.mockResolvedValueOnce({
      ...mockResolve,
      attributes: {
        alertDeletion: {
          ...mockResolve.attributes.alertDeletion,
          isActiveAlertsDeletionEnabled: false,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 1,
          inactiveAlertsDeletionThreshold: 90,
        },
      },
    });

    // Try to update with new values
    const result = await client.update({
      isActiveAlertsDeletionEnabled: false,
      isInactiveAlertsDeletionEnabled: true,
      activeAlertsDeletionThreshold: 1,
      inactiveAlertsDeletionThreshold: 90,
    });

    // Tried to get first, but no results
    expect(savedObjectsClient.get).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID
    );

    // So create a new entry
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      {
        alertDeletion: expect.objectContaining({
          isActiveAlertsDeletionEnabled:
            mockAttributes.alertDeletion?.isActiveAlertsDeletionEnabled,
          isInactiveAlertsDeletionEnabled:
            mockAttributes.alertDeletion?.isInactiveAlertsDeletionEnabled,
          activeAlertsDeletionThreshold:
            mockAttributes.alertDeletion?.activeAlertsDeletionThreshold,
          inactiveAlertsDeletionThreshold:
            mockAttributes.alertDeletion?.inactiveAlertsDeletionThreshold,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      {
        id: RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID,
        overwrite: true,
      }
    );

    // Try to update with version
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_ALERT_DELETION_SAVED_OBJECT_ID,
      {
        alertDeletion: expect.objectContaining({
          isActiveAlertsDeletionEnabled: false,
          isInactiveAlertsDeletionEnabled: true,
          activeAlertsDeletionThreshold: 1,
          inactiveAlertsDeletionThreshold: 90,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      { version: '123' }
    );

    expect(result).toEqual(
      expect.objectContaining({
        isActiveAlertsDeletionEnabled: false,
        isInactiveAlertsDeletionEnabled: true,
        activeAlertsDeletionThreshold: 1,
        inactiveAlertsDeletionThreshold: 90,
      })
    );
  });
});
