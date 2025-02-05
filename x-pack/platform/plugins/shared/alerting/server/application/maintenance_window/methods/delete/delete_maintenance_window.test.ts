/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteMaintenanceWindow } from './delete_maintenance_window';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../../../common';

const savedObjectsClient = savedObjectsClientMock.create();
const uiSettings = uiSettingsServiceMock.createClient();

const mockContext: jest.Mocked<MaintenanceWindowClientContext> = {
  logger: loggingSystemMock.create().get(),
  getModificationMetadata: jest.fn(),
  savedObjectsClient,
  uiSettings,
};

describe('MaintenanceWindowClient - delete', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should delete maintenance window by id', async () => {
    savedObjectsClient.delete.mockResolvedValueOnce({});

    const result = await deleteMaintenanceWindow(mockContext, { id: 'test-id' });

    expect(savedObjectsClient.delete).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      'test-id',
      undefined
    );

    expect(result).toEqual({});
  });

  it('should errors when deletion fails', async () => {
    savedObjectsClient.delete.mockRejectedValueOnce('something went wrong');

    await expect(async () => {
      await deleteMaintenanceWindow(mockContext, { id: 'test-id' });
    }).rejects.toThrowError();

    expect(mockContext.logger.error).toHaveBeenLastCalledWith(
      'Failed to delete maintenance window by id: test-id, Error: something went wrong'
    );
  });
});
