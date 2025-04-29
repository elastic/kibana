/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { KueryNode } from '@kbn/es-query';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getMockMaintenanceWindow } from '../data/maintenance_window/test_helpers';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../types';
import {
  findMaintenanceWindowsSo,
  generateEventsAndUpdateMaintenanceWindowSavedObjects,
  getStatusFilter,
} from './task';

const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();

const finishedMaintenanceWindowMock = {
  id: '1',
  type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  attributes: getMockMaintenanceWindow({
    title: 'MW 1',
    enabled: true,
    duration: 7200000,
    expirationDate: '2025-04-26T09:00:00.000Z',
    events: [],
    rRule: {
      count: 10,
      interval: 1,
      freq: 3,
      dtstart: '2024-04-24T12:30:37.011Z',
      tzid: 'UTC',
    },
  }),
  references: [],
};

const nonRecurringMaintenanceWindowMock = {
  id: '2',
  type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  attributes: getMockMaintenanceWindow({
    title: 'MW 2',
    enabled: true,
    duration: 86400000,
    expirationDate: '2025-04-26T13:57:24.383Z',
    events: [
      {
        gte: '2025-04-22T09:00:37.011Z',
        lte: '2025-04-22T17:00:37.011Z',
      },
    ],
    rRule: { dtstart: '2025-04-22T12:30:37.011Z', tzid: 'UTC' },
  }),
  references: [],
};

const upcomingMaintenanceWindowMock = {
  id: '3',
  type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  attributes: getMockMaintenanceWindow({
    title: 'MW 3',
    enabled: true,
    duration: 7200000,
    expirationDate: '2025-04-24T00:00:00.000Z',
    events: [
      {
        gte: '2025-04-20T09:00:00.000Z',
        lte: '2025-04-20T17:00:00.000Z',
      },
    ],
    rRule: {
      until: '2028-12-31T12:00:00.000Z',
      interval: 1,
      freq: 1,
      dtstart: '2025-04-20T09:00:00.000Z',
      tzid: 'UTC',
    },
  }),
  references: [],
};

const runningMaintenanceWindowMock = {
  id: '4',
  type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  attributes: getMockMaintenanceWindow({
    title: 'MW 4',
    enabled: true,
    duration: 28800000,
    expirationDate: '2025-04-29T00:00:00.000Z',
    events: [
      {
        gte: '2025-04-23T05:00:00.000Z',
        lte: '2025-04-23T17:00:00.000Z',
      },
    ],
    rRule: {
      until: '2026-12-31T12:00:00.000Z',
      interval: 1,
      freq: 0,
      dtstart: '2025-04-23T05:00:00.000Z',
      tzid: 'UTC',
    },
  }),
  references: [],
};

const finishedWithEventsMaintenanceWindowMock = {
  id: '5',
  type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  attributes: getMockMaintenanceWindow({
    title: 'MW 5',
    enabled: true,
    duration: 7200000,
    expirationDate: '2025-04-26T09:00:00.000Z',
    events: [
      {
        gte: '2025-03-31T00:00:00.011Z',
        lte: '2025-03-31T10:00:00.011Z',
      },
      {
        gte: '2025-04-07T00:00:00.011Z',
        lte: '2025-04-07T10:00:00.011Z',
      },
      {
        gte: '2025-04-14T00:00:00.011Z',
        lte: '2025-04-14T10:00:00.011Z',
      },
      {
        gte: '2025-04-21T00:00:00.011Z',
        lte: '2025-04-21T10:00:00.011Z',
      },
    ],
    rRule: {
      byweekday: ['+1MO'],
      count: 4,
      interval: 1,
      freq: 2,
      dtstart: '2025-03-31T00:00:00.011Z',
      tzid: 'UTC',
    },
  }),
  references: [],
};

const statusFilter = {
  arguments: [
    {
      arguments: [
        {
          isQuoted: false,
          type: 'literal',
          value: 'maintenance-window.attributes.events',
        },
        {
          isQuoted: false,
          type: 'literal',
          value: 'now',
        },
      ],
      function: 'is',
      type: 'function',
    },
    {
      arguments: [
        {
          arguments: [
            {
              arguments: [
                {
                  isQuoted: false,
                  type: 'literal',
                  value: 'maintenance-window.attributes.events',
                },
                {
                  isQuoted: false,
                  type: 'literal',
                  value: 'now',
                },
              ],
              function: 'is',
              type: 'function',
            },
          ],
          function: 'not',
          type: 'function',
        },
        {
          arguments: [
            {
              isQuoted: false,
              type: 'literal',
              value: 'maintenance-window.attributes.events',
            },
            'gte',
            {
              isQuoted: false,
              type: 'literal',
              value: 'now',
            },
          ],
          function: 'range',
          type: 'function',
        },
      ],
      function: 'and',
      type: 'function',
    },
    {
      arguments: [
        {
          arguments: [
            {
              arguments: [
                {
                  isQuoted: false,
                  type: 'literal',
                  value: 'maintenance-window.attributes.events',
                },
                'gte',
                {
                  isQuoted: false,
                  type: 'literal',
                  value: 'now',
                },
              ],
              function: 'range',
              type: 'function',
            },
          ],
          function: 'not',
          type: 'function',
        },
        {
          arguments: [
            {
              isQuoted: false,
              type: 'literal',
              value: 'maintenance-window.attributes.expirationDate',
            },
            'gte',
            {
              isQuoted: false,
              type: 'literal',
              value: 'now',
            },
          ],
          function: 'range',
          type: 'function',
        },
      ],
      function: 'and',
      type: 'function',
    },
  ],
  function: 'or',
  type: 'function',
};

const mockCreatePointInTimeFinderAsInternalUser = (
  response = {
    saved_objects: [
      finishedMaintenanceWindowMock,
      nonRecurringMaintenanceWindowMock,
      upcomingMaintenanceWindowMock,
      runningMaintenanceWindowMock,
    ],
  } as unknown
) => {
  internalSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockResolvedValueOnce({
    close: jest.fn(),
    find: function* asyncGenerator() {
      yield response;
    },
  });
};

describe('Maintenance window events generator task', () => {
  const mockCurrentDate = new Date('2025-04-23T09:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(mockCurrentDate);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('getStatusFilter', () => {
    test('should build status filter', () => {
      expect(getStatusFilter()).toEqual(statusFilter);
    });
  });

  describe('findMaintenanceWindowsSo', () => {
    it('throws an error if createPointInTimeFinder has an error', async () => {
      internalSavedObjectsRepository.createPointInTimeFinder = jest
        .fn()
        .mockRejectedValueOnce(new Error('error!'));

      await findMaintenanceWindowsSo({
        savedObjectsClient: internalSavedObjectsRepository,
        logger,
        filter: statusFilter as KueryNode,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find maintenance windows saved object". Error: error!'
      );
    });

    it('should find maintenance windows', async () => {
      mockCreatePointInTimeFinderAsInternalUser();

      const result = await findMaintenanceWindowsSo({
        savedObjectsClient: internalSavedObjectsRepository,
        logger,
        filter: statusFilter as KueryNode,
      });

      expect(result.length).toEqual(4);
      expect(result[0].id).toEqual('1');
      expect(result[1].id).toEqual('2');
      expect(result[2].id).toEqual('3');
      expect(result[3].id).toEqual('4');
    });
  });

  describe('generateEventsAndUpdateMaintenanceWindowSavedObjects', () => {
    test('should succeed when there are no maintenance windows to update', async () => {
      const total = await generateEventsAndUpdateMaintenanceWindowSavedObjects({
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        maintenanceWindowsSO: [],
        startRangeDate: '2025-04-23T09:00:00.000Z',
      });

      expect(internalSavedObjectsRepository.update).not.toHaveBeenCalled();
      expect(total).toEqual(0);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "0"`);
    });

    test('should not update maintenance window when finished', async () => {
      const total = await generateEventsAndUpdateMaintenanceWindowSavedObjects({
        maintenanceWindowsSO: [finishedWithEventsMaintenanceWindowMock],
        startRangeDate: '2025-04-23T09:00:00.000Z',
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(internalSavedObjectsRepository.update).not.toHaveBeenCalled();
      expect(total).toEqual(0);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "0"`);
    });

    test('should not generate new events when events are empty', async () => {
      const total = await generateEventsAndUpdateMaintenanceWindowSavedObjects({
        maintenanceWindowsSO: [finishedMaintenanceWindowMock],
        startRangeDate: '2025-04-23T09:00:00.000Z',
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(internalSavedObjectsRepository.update).not.toHaveBeenCalled();
      expect(total).toEqual(0);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "0"`);
    });

    test('should ignore maintenance window if it does not have recurring schedule', async () => {
      const total = await generateEventsAndUpdateMaintenanceWindowSavedObjects({
        maintenanceWindowsSO: [finishedMaintenanceWindowMock, nonRecurringMaintenanceWindowMock],
        startRangeDate: '2025-04-23T09:00:00.000Z',
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(internalSavedObjectsRepository.update).not.toHaveBeenCalled();
      expect(total).toEqual(0);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "0"`);
    });

    test('should generate single events set', async () => {
      const total = await generateEventsAndUpdateMaintenanceWindowSavedObjects({
        maintenanceWindowsSO: [
          {
            ...finishedWithEventsMaintenanceWindowMock,
            attributes: {
              ...finishedWithEventsMaintenanceWindowMock.attributes,
              rRule: { ...finishedWithEventsMaintenanceWindowMock.attributes.rRule, count: 5 },
            },
          },
        ],
        startRangeDate: '2025-04-23T09:00:00.000Z',
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(internalSavedObjectsRepository.update).toHaveBeenCalledTimes(1);
      expect(internalSavedObjectsRepository.update).toHaveBeenNthCalledWith(
        1,
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        '5',
        {
          ...finishedWithEventsMaintenanceWindowMock.attributes,
          rRule: {
            ...finishedWithEventsMaintenanceWindowMock.attributes.rRule,
            count: 5,
          },
          events: [
            ...finishedWithEventsMaintenanceWindowMock.attributes.events,
            {
              gte: '2025-04-28T00:00:00.011Z',
              lte: '2025-04-28T02:00:00.011Z',
            },
          ],
          expirationDate: moment(mockCurrentDate).tz('UTC').add(1, 'year').toISOString(),
        }
      );
      expect(total).toEqual(1);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "1"`);
    });

    test('should update multiple maintenance windows with new events', async () => {
      const total = await generateEventsAndUpdateMaintenanceWindowSavedObjects({
        maintenanceWindowsSO: [
          finishedMaintenanceWindowMock,
          nonRecurringMaintenanceWindowMock,
          upcomingMaintenanceWindowMock,
          runningMaintenanceWindowMock,
        ],
        startRangeDate: '2025-04-23T09:00:00.000Z',
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(internalSavedObjectsRepository.update).toHaveBeenCalledTimes(2);
      expect(internalSavedObjectsRepository.update).toHaveBeenNthCalledWith(
        1,
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        '3',
        {
          ...upcomingMaintenanceWindowMock.attributes,
          events: [
            ...upcomingMaintenanceWindowMock.attributes.events,
            {
              gte: '2025-05-20T09:00:00.000Z',
              lte: '2025-05-20T11:00:00.000Z',
            },
            {
              gte: '2025-06-20T09:00:00.000Z',
              lte: '2025-06-20T11:00:00.000Z',
            },
            {
              gte: '2025-07-20T09:00:00.000Z',
              lte: '2025-07-20T11:00:00.000Z',
            },
            {
              gte: '2025-08-20T09:00:00.000Z',
              lte: '2025-08-20T11:00:00.000Z',
            },
            {
              gte: '2025-09-20T09:00:00.000Z',
              lte: '2025-09-20T11:00:00.000Z',
            },
            {
              gte: '2025-10-20T09:00:00.000Z',
              lte: '2025-10-20T11:00:00.000Z',
            },
            {
              gte: '2025-11-20T09:00:00.000Z',
              lte: '2025-11-20T11:00:00.000Z',
            },
            {
              gte: '2025-12-20T09:00:00.000Z',
              lte: '2025-12-20T11:00:00.000Z',
            },
            {
              gte: '2026-01-20T09:00:00.000Z',
              lte: '2026-01-20T11:00:00.000Z',
            },
            {
              gte: '2026-02-20T09:00:00.000Z',
              lte: '2026-02-20T11:00:00.000Z',
            },
            {
              gte: '2026-03-20T09:00:00.000Z',
              lte: '2026-03-20T11:00:00.000Z',
            },
            {
              gte: '2026-04-20T09:00:00.000Z',
              lte: '2026-04-20T11:00:00.000Z',
            },
          ],
          expirationDate: moment(mockCurrentDate).tz('UTC').add(1, 'year').toISOString(),
        }
      );
      expect(internalSavedObjectsRepository.update).toHaveBeenNthCalledWith(
        2,
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        '4',
        {
          ...runningMaintenanceWindowMock.attributes,
          expirationDate: moment(mockCurrentDate).tz('UTC').add(1, 'year').toISOString(),
          events: [
            ...runningMaintenanceWindowMock.attributes.events,
            {
              gte: '2026-04-23T05:00:00.000Z',
              lte: '2026-04-23T13:00:00.000Z',
            },
          ],
        }
      );
      expect(total).toEqual(2);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "2"`);
    });

    test('should handle errors during update', async () => {
      internalSavedObjectsRepository.update.mockRejectedValueOnce(
        new Error('something went wrong')
      );

      const total = await generateEventsAndUpdateMaintenanceWindowSavedObjects({
        maintenanceWindowsSO: [runningMaintenanceWindowMock],
        startRangeDate: '2025-05-23T09:00:00.000Z',
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update events in maintenance windows saved object". Error: something went wrong'
      );
      expect(total).toEqual(0);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "0"`);
    });
  });
});
