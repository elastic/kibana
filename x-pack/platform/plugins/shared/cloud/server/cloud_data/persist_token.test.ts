/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { persistTokenCloudData } from './persist_token'; // Adjust the import based on the actual file path
import { Logger, SavedObjectsClientContract, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { CLOUD_DATA_SAVED_OBJECT_TYPE } from '../saved_objects';
import { CLOUD_DATA_SAVED_OBJECT_ID } from '../routes/constants';

const mockSavedObjectsClient = {
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
} as unknown as SavedObjectsClientContract;

const mockLogger = {
  error: jest.fn(),
} as unknown as Logger;

describe('persistTokenCloudData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a new saved object if none exists and onboardingToken is provided', async () => {
    (mockSavedObjectsClient.get as jest.Mock).mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError()
    );
    await persistTokenCloudData(mockSavedObjectsClient, {
      logger: mockLogger,
      onboardingToken: 'test_token',
      solutionType: 'test_solution',
    });

    expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
      CLOUD_DATA_SAVED_OBJECT_TYPE,
      {
        onboardingData: {
          solutionType: 'test_solution',
          token: 'test_token',
        },
      },
      { id: CLOUD_DATA_SAVED_OBJECT_ID }
    );
  });

  it('creates a new saved object if none exists and security details are provided', async () => {
    (mockSavedObjectsClient.get as jest.Mock).mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError()
    );
    await persistTokenCloudData(mockSavedObjectsClient, {
      logger: mockLogger,
      solutionType: 'security',
      security: {
        useCase: 'siem',
        migration: {
          value: true,
          type: 'splunk',
        },
      },
    });

    expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
      CLOUD_DATA_SAVED_OBJECT_TYPE,
      {
        onboardingData: {
          solutionType: 'security',
          token: '',
          security: {
            useCase: 'siem',
            migration: {
              value: true,
              type: 'splunk',
            },
          },
        },
      },
      { id: CLOUD_DATA_SAVED_OBJECT_ID }
    );
  });

  it('updates an existing saved object if onboardingToken is provided and different', async () => {
    (mockSavedObjectsClient.get as jest.Mock).mockResolvedValue({
      id: CLOUD_DATA_SAVED_OBJECT_ID,
      attributes: {
        onboardingData: {
          token: 'old_token',
          solutionType: 'test_solution',
        },
      },
    });
    await persistTokenCloudData(mockSavedObjectsClient, {
      logger: mockLogger,
      onboardingToken: 'new_token',
      solutionType: 'test_solution',
    });

    expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
      CLOUD_DATA_SAVED_OBJECT_TYPE,
      CLOUD_DATA_SAVED_OBJECT_ID,
      {
        onboardingData: {
          solutionType: 'test_solution',
          token: 'new_token',
        },
      }
    );
  });

  it('updates an existing saved object if security details are provided and different', async () => {
    (mockSavedObjectsClient.get as jest.Mock).mockResolvedValue({
      id: CLOUD_DATA_SAVED_OBJECT_ID,
      attributes: {
        onboardingData: {
          solutionType: 'security',
          token: 'test_token',
          security: {
            useCase: 'siem',
            migration: {
              value: true,
              type: 'splunk',
            },
          },
        },
      },
    });

    await persistTokenCloudData(mockSavedObjectsClient, {
      logger: mockLogger,
      solutionType: 'security',
      security: {
        useCase: 'siem',
        migration: {
          value: false,
        },
      },
    });

    expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
      CLOUD_DATA_SAVED_OBJECT_TYPE,
      CLOUD_DATA_SAVED_OBJECT_ID,
      {
        onboardingData: {
          solutionType: 'security',
          token: 'test_token',
          security: {
            useCase: 'siem',
            migration: {
              value: false,
            },
          },
        },
      }
    );
  });

  it('does nothing if onboardingToken and security details are the same', async () => {
    (mockSavedObjectsClient.get as jest.Mock).mockResolvedValue({
      id: CLOUD_DATA_SAVED_OBJECT_ID,
      attributes: {
        onboardingData: {
          token: 'same_token',
          solutionType: 'test_solution',
          security: {
            useCase: 'siem',
            migration: {
              value: true,
              type: 'splunk',
            },
          },
        },
      },
    });
    await persistTokenCloudData(mockSavedObjectsClient, {
      logger: mockLogger,
      onboardingToken: 'same_token',
      solutionType: 'test_solution',
      security: {
        useCase: 'siem',
        migration: {
          value: true,
          type: 'splunk',
        },
      },
    });

    expect(mockSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('logs an error if get throws an unexpected error', async () => {
    (mockSavedObjectsClient.get as jest.Mock).mockRejectedValue(
      SavedObjectsErrorHelpers.createBadRequestError()
    );

    await persistTokenCloudData(mockSavedObjectsClient, {
      logger: mockLogger,
      onboardingToken: 'test_token',
      solutionType: 'test_solution',
    });

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('throws an error if get throws an unexpected error and returnError is true', async () => {
    (mockSavedObjectsClient.get as jest.Mock).mockRejectedValue(
      SavedObjectsErrorHelpers.createBadRequestError()
    );

    await expect(
      persistTokenCloudData(mockSavedObjectsClient, {
        logger: mockLogger,
        returnError: true,
        onboardingToken: 'test_token',
        solutionType: 'test_solution',
      })
    ).rejects.toThrow();
  });

  it('logs an error if create throws an error', async () => {
    (mockSavedObjectsClient.get as jest.Mock).mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError()
    );
    const error = new Error('Create error');
    (mockSavedObjectsClient.create as jest.Mock).mockRejectedValue(error);

    await persistTokenCloudData(mockSavedObjectsClient, {
      logger: mockLogger,
      onboardingToken: 'test_token',
      solutionType: 'test_solution',
    });

    expect(mockLogger.error).toHaveBeenCalledWith(error);
  });

  it('throws an error if create throws an error and returnError is true', async () => {
    (mockSavedObjectsClient.get as jest.Mock).mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError()
    );
    const error = new Error('Create error');
    (mockSavedObjectsClient.create as jest.Mock).mockRejectedValue(error);

    await expect(
      persistTokenCloudData(mockSavedObjectsClient, {
        logger: mockLogger,
        returnError: true,
        onboardingToken: 'test_token',
        solutionType: 'test_solution',
      })
    ).rejects.toThrow(error);
  });
});
