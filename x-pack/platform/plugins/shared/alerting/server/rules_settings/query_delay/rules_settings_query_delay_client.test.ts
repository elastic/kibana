/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  RULES_SETTINGS_FEATURE_ID,
  RULES_SETTINGS_SAVED_OBJECT_TYPE,
  RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID,
  RulesSettings,
  DEFAULT_QUERY_DELAY_SETTINGS,
} from '../../../common';
import {
  RulesSettingsQueryDelayClient,
  RulesSettingsQueryDelayClientConstructorOptions,
} from './rules_settings_query_delay_client';

const mockDateString = '2019-02-12T21:01:22.479Z';

const savedObjectsClient = savedObjectsClientMock.create();

const getMockRulesSettings = (): RulesSettings => {
  return {
    queryDelay: {
      delay: DEFAULT_QUERY_DELAY_SETTINGS.delay,
      createdBy: 'test name',
      updatedBy: 'test name',
      createdAt: '2023-03-24T00:00:00.000Z',
      updatedAt: '2023-03-24T00:00:00.000Z',
    },
  };
};

const rulesSettingsQueryDelayClientParams: jest.Mocked<RulesSettingsQueryDelayClientConstructorOptions> =
  {
    logger: loggingSystemMock.create().get(),
    isServerless: false,
    getModificationMetadata: jest.fn(),
    savedObjectsClient,
  };

const updatedMetadata = {
  createdAt: '2023-03-26T00:00:00.000Z',
  updatedAt: '2023-03-26T00:00:00.000Z',
  createdBy: 'updated-user',
  updatedBy: 'updated-user',
};

describe('RulesSettingsQueryDelayClient', () => {
  beforeEach(() => {
    rulesSettingsQueryDelayClientParams.getModificationMetadata.mockResolvedValue(updatedMetadata);
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

  test('can get query delay settings', async () => {
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);
    const result = await client.get();

    expect(result).toEqual(
      expect.objectContaining({
        delay: DEFAULT_QUERY_DELAY_SETTINGS.delay,
        createdBy: 'test name',
        updatedBy: 'test name',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  test('can update query delay settings', async () => {
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);

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
        queryDelay: {
          ...mockResolve.attributes.queryDelay,
          delay: 19,
        },
      },
    });

    const result = await client.update({
      delay: 19,
    });

    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID,
      {
        queryDelay: expect.objectContaining({
          delay: 19,
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
        delay: 19,
        createdBy: 'test name',
        updatedBy: 'test name',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
  });

  test('throws if savedObjectsClient failed to update', async () => {
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);
    savedObjectsClient.update.mockRejectedValueOnce(new Error('failed!!'));

    await expect(
      client.update({
        delay: 19,
      })
    ).rejects.toThrowError(
      'savedObjectsClient errored trying to update query delay settings: failed!!'
    );
  });

  test('throws if new query delay setting fails verification', async () => {
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);
    await expect(
      client.update({
        delay: 200,
      })
    ).rejects.toThrowError('Invalid query delay value, must be between 0 and 60, but got: 200.');
  });

  test('can create a new query delay settings saved object', async () => {
    rulesSettingsQueryDelayClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);
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
        queryDelay: expect.objectContaining({
          delay: 0,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      {
        id: RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID,
        overwrite: true,
      }
    );
    expect(result.attributes).toEqual(mockAttributes);
  });

  test('can create a new query delay settings saved object with default serverless value', async () => {
    rulesSettingsQueryDelayClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsQueryDelayClient({
      ...rulesSettingsQueryDelayClientParams,
      isServerless: true,
    });

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
        queryDelay: expect.objectContaining({
          delay: 15,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      {
        id: RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID,
        overwrite: true,
      }
    );
    expect(result.attributes).toEqual(mockAttributes);
  });

  test('can get existing query delay settings saved object', async () => {
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);
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
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);

    savedObjectsClient.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID
      )
    );
    await expect(client.get()).rejects.toThrowError();
  });

  test('can persist query delay settings when saved object already exists', async () => {
    rulesSettingsQueryDelayClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);
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
      RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID
    );
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
    expect(result).toEqual(mockAttributes.queryDelay);
  });

  test('can update query delay settings when saved object does not exist', async () => {
    rulesSettingsQueryDelayClientParams.getModificationMetadata.mockResolvedValueOnce({
      ...updatedMetadata,
      createdBy: 'test name',
      updatedBy: 'test name',
    });
    const client = new RulesSettingsQueryDelayClient(rulesSettingsQueryDelayClientParams);
    const mockAttributes = getMockRulesSettings();

    savedObjectsClient.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        RULES_SETTINGS_SAVED_OBJECT_TYPE,
        RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID
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
        queryDelay: {
          ...mockResolve.attributes.queryDelay,
          delay: 5,
        },
      },
    });

    // Try to update with new values
    const result = await client.update({
      delay: 5,
    });

    // Tried to get first, but no results
    expect(savedObjectsClient.get).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID
    );

    // So create a new entry
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      {
        queryDelay: expect.objectContaining({
          delay: mockAttributes.queryDelay?.delay,
          createdBy: 'test name',
          updatedBy: 'test name',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      },
      {
        id: RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID,
        overwrite: true,
      }
    );

    // Try to update with version
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      RULES_SETTINGS_SAVED_OBJECT_TYPE,
      RULES_SETTINGS_QUERY_DELAY_SAVED_OBJECT_ID,
      {
        queryDelay: expect.objectContaining({
          delay: 5,
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
        delay: 5,
      })
    );
  });
});
