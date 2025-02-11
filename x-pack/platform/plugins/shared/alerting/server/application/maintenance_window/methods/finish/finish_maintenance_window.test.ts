/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { Frequency } from '@kbn/rrule';
import { finishMaintenanceWindow } from './finish_maintenance_window';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { SavedObjectsUpdateResponse, SavedObject } from '@kbn/core/server';
import {
  MaintenanceWindowClientContext,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
} from '../../../../../common';
import { getMockMaintenanceWindow } from '../../../../data/maintenance_window/test_helpers';
import type { MaintenanceWindow } from '../../types';

const savedObjectsClient = savedObjectsClientMock.create();
const uiSettings = uiSettingsServiceMock.createClient();

const firstTimestamp = '2023-02-26T00:00:00.000Z';

const updatedMetadata = {
  createdAt: '2023-03-26T00:00:00.000Z',
  updatedAt: '2023-03-26T00:00:00.000Z',
  createdBy: 'updated-user',
  updatedBy: 'updated-user',
};

const mockContext: jest.Mocked<MaintenanceWindowClientContext> = {
  logger: loggingSystemMock.create().get(),
  getModificationMetadata: jest.fn(),
  savedObjectsClient,
  uiSettings,
};

describe('MaintenanceWindowClient - finish', () => {
  beforeEach(() => {
    mockContext.getModificationMetadata.mockResolvedValueOnce(updatedMetadata);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should finish the currently running maintenance window event', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));
    const mockMaintenanceWindow = getMockMaintenanceWindow({
      duration: 60 * 60 * 1000,
      expirationDate: moment.utc().add(1, 'year').toISOString(),
      rRule: {
        tzid: 'UTC',
        dtstart: moment().utc().toISOString(),
        freq: Frequency.WEEKLY,
        count: 2,
      } as MaintenanceWindow['rRule'],
    });

    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    savedObjectsClient.update.mockResolvedValueOnce({
      attributes: {
        ...mockMaintenanceWindow,
        ...updatedMetadata,
        events: [
          { gte: '2023-02-26T00:00:00.000Z', lte: '2023-02-26T00:30:00.000Z' },
          { gte: '2023-03-05T00:00:00.000Z', lte: '2023-03-05T01:00:00.000Z' },
        ],
      },
      id: 'test-id',
    } as unknown as SavedObjectsUpdateResponse);

    // Move 30 mins into the future
    jest.useFakeTimers().setSystemTime(moment.utc(firstTimestamp).add(30, 'minute').toDate());

    const result = await finishMaintenanceWindow(mockContext, { id: 'test-id' });

    expect(savedObjectsClient.update).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      'test-id',
      expect.objectContaining({
        expirationDate: moment.utc().add(1, 'year').toISOString(),
        events: [
          // Event ends 30 mins earlier, just like expected}
          { gte: '2023-02-26T00:00:00.000Z', lte: '2023-02-26T00:30:00.000Z' },
          { gte: '2023-03-05T00:00:00.000Z', lte: '2023-03-05T01:00:00.000Z' },
        ],
      }),
      { version: '123' }
    );
    expect(result.status).toEqual('upcoming');
    expect(result.eventStartTime).toEqual('2023-03-05T00:00:00.000Z');
    expect(result.eventEndTime).toEqual('2023-03-05T01:00:00.000Z');
  });

  it('should keep events that were finished in the past', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));
    const modifiedEvents = [
      { gte: '2023-03-26T00:00:00.000Z', lte: '2023-03-26T00:12:34.000Z' },
      { gte: '2023-04-01T23:00:00.000Z', lte: '2023-04-01T23:43:21.000Z' },
    ];
    const mockMaintenanceWindow = getMockMaintenanceWindow({
      rRule: {
        tzid: 'CET',
        dtstart: '2023-03-26T00:00:00.000Z',
        freq: Frequency.WEEKLY,
        count: 5,
      } as MaintenanceWindow['rRule'],
      events: modifiedEvents,
      expirationDate: moment(new Date(firstTimestamp)).tz('UTC').add(2, 'week').toISOString(),
    });

    savedObjectsClient.get.mockResolvedValue({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    savedObjectsClient.update.mockResolvedValue({
      attributes: {
        ...mockMaintenanceWindow,
        ...updatedMetadata,
      },
      id: 'test-id',
    } as unknown as SavedObjectsUpdateResponse);

    jest.useFakeTimers().setSystemTime(new Date('2023-04-15T23:30:00.000Z'));

    await finishMaintenanceWindow(mockContext, { id: 'test-id' });

    expect(savedObjectsClient.update).toHaveBeenLastCalledWith(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      'test-id',
      expect.objectContaining({
        events: [
          ...modifiedEvents,
          { gte: '2023-04-08T23:00:00.000Z', lte: '2023-04-09T00:00:00.000Z' },
          { gte: '2023-04-15T23:00:00.000Z', lte: '2023-04-15T23:30:00.000Z' },
          { gte: '2023-04-22T23:00:00.000Z', lte: '2023-04-23T00:00:00.000Z' },
        ],
      }),
      { version: '123' }
    );
  });

  it('should throw if trying to finish a maintenance window that is not running', async () => {
    jest.useFakeTimers().setSystemTime(new Date(firstTimestamp));
    const mockMaintenanceWindow = getMockMaintenanceWindow({
      duration: 60 * 60 * 1000, //
      expirationDate: moment.utc().add(1, 'year').toISOString(),
      rRule: {
        tzid: 'UTC',
        dtstart: moment().utc().toISOString(),
        freq: Frequency.WEEKLY,
        count: 2,
      } as MaintenanceWindow['rRule'],
    });

    savedObjectsClient.get.mockResolvedValueOnce({
      attributes: mockMaintenanceWindow,
      version: '123',
      id: 'test-id',
    } as unknown as SavedObject);

    // Move 2 hours into the future
    jest.useFakeTimers().setSystemTime(moment.utc(firstTimestamp).add(2, 'hours').toDate());

    await expect(async () => {
      await finishMaintenanceWindow(mockContext, { id: 'test-id' });
    }).rejects.toThrowError();

    expect(mockContext.logger.error).toHaveBeenLastCalledWith(
      'Failed to finish maintenance window by id: test-id, Error: Error: Cannot finish maintenance window that is not running'
    );
  });
});
