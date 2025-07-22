/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { fromKueryExpression, type KueryNode } from '@kbn/es-query';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { getMockMaintenanceWindow } from '../data/maintenance_window/test_helpers';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../types';
import {
  getSOFinder,
  generateEvents,
  getStatusFilter,
  updateMaintenanceWindowsEvents,
  createEventsGeneratorTaskRunner,
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

const runningMaintenanceWindowMock1 = {
  id: '6',
  type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  attributes: getMockMaintenanceWindow({
    title: 'MW 6',
    enabled: true,
    duration: 28800000,
    expirationDate: '2025-04-16T15:00:00.000Z', // expiration date is 1 week before current date
    events: [
      {
        gte: '2025-04-15T05:00:00.000Z',
        lte: '2025-04-15T13:00:00.000Z',
      },
    ],
    rRule: {
      until: '2025-05-30T12:00:00.000Z',
      interval: 1,
      freq: 2,
      dtstart: '2025-04-15T05:00:00.000Z',
      tzid: 'UTC',
    },
  }),
  references: [],
};

const statusFilter: KueryNode = fromKueryExpression(
  `maintenance-window.attributes.events is now or (not maintenance-window.attributes.events is now and maintenance-window.attributes.events range gt now) or (not maintenance-window.attributes.events range gte now and maintenance-window.attributes.expirationDate range gt now)`
);

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
  internalSavedObjectsRepository.createPointInTimeFinder = jest.fn().mockReturnValueOnce({
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
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('getStatusFilter', () => {
    test('should build status filter', () => {
      expect(getStatusFilter()).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "maintenance-window.attributes.events",
                },
                Object {
                  "isQuoted": true,
                  "type": "literal",
                  "value": "now",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "arguments": Array [
                        Object {
                          "isQuoted": false,
                          "type": "literal",
                          "value": "maintenance-window.attributes.events",
                        },
                        Object {
                          "isQuoted": true,
                          "type": "literal",
                          "value": "now",
                        },
                      ],
                      "function": "is",
                      "type": "function",
                    },
                  ],
                  "function": "not",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "maintenance-window.attributes.events",
                    },
                    "gt",
                    Object {
                      "isQuoted": true,
                      "type": "literal",
                      "value": "now",
                    },
                  ],
                  "function": "range",
                  "type": "function",
                },
              ],
              "function": "and",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "arguments": Array [
                    Object {
                      "arguments": Array [
                        Object {
                          "isQuoted": false,
                          "type": "literal",
                          "value": "maintenance-window.attributes.events",
                        },
                        "gte",
                        Object {
                          "isQuoted": true,
                          "type": "literal",
                          "value": "now",
                        },
                      ],
                      "function": "range",
                      "type": "function",
                    },
                  ],
                  "function": "not",
                  "type": "function",
                },
                Object {
                  "arguments": Array [
                    Object {
                      "isQuoted": false,
                      "type": "literal",
                      "value": "maintenance-window.attributes.expirationDate",
                    },
                    "gt",
                    Object {
                      "isQuoted": true,
                      "type": "literal",
                      "value": "now",
                    },
                  ],
                  "function": "range",
                  "type": "function",
                },
              ],
              "function": "and",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });
  });

  describe('getSOFinder', () => {
    it('should return finder', () => {
      mockCreatePointInTimeFinderAsInternalUser();

      const result = getSOFinder({
        savedObjectsClient: internalSavedObjectsRepository,
        logger,
        filter: statusFilter as KueryNode,
      });

      expect(result).toMatchInlineSnapshot(`
        Object {
          "close": [MockFunction],
          "find": [Function],
        }
      `);
    });
  });

  describe('generateEvents', () => {
    test('should handle empty maintenance windows', async () => {
      const totalMWs = await generateEvents({
        maintenanceWindowsSO: [],
        startRangeDate: '2025-04-23T09:00:00.000Z',
      });

      expect(totalMWs).toEqual([]);
    });

    test('should not generate events when finished maintenance window', async () => {
      const totalMWs = await generateEvents({
        maintenanceWindowsSO: [finishedWithEventsMaintenanceWindowMock],
        startRangeDate: '2025-04-23T09:00:00.000Z',
      });

      expect(totalMWs).toEqual([]);
    });

    test('should not generate new events when events are empty', async () => {
      const totalMWs = await generateEvents({
        maintenanceWindowsSO: [finishedMaintenanceWindowMock],
        startRangeDate: '2025-04-23T09:00:00.000Z',
      });

      expect(totalMWs).toEqual([]);
    });

    test('should ignore maintenance window if it does not have recurring schedule', async () => {
      const totalMWs = await generateEvents({
        maintenanceWindowsSO: [finishedMaintenanceWindowMock, nonRecurringMaintenanceWindowMock],
        startRangeDate: '2025-04-23T09:00:00.000Z',
      });

      expect(totalMWs).toEqual([]);
    });

    test('should return multiple maintenance windows with new events', async () => {
      const upcomingMaintenanceWindowAttributes = {
        ...upcomingMaintenanceWindowMock.attributes,
        events: [
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
        expirationDate: moment(mockCurrentDate).tz('UTC').endOf('day').add(1, 'year').toISOString(),
      };

      const total = await generateEvents({
        maintenanceWindowsSO: [
          finishedMaintenanceWindowMock,
          nonRecurringMaintenanceWindowMock,
          upcomingMaintenanceWindowMock,
          runningMaintenanceWindowMock,
        ],
        startRangeDate: '2025-04-23T09:00:00.000Z',
      });

      expect(total).toEqual([
        {
          id: '3',
          ...upcomingMaintenanceWindowAttributes,
          eventEndTime: '2025-04-20T17:00:00.000Z',
          eventStartTime: '2025-04-20T09:00:00.000Z',
          status: 'finished',
        },
        {
          id: '4',
          eventEndTime: '2025-04-23T17:00:00.000Z',
          eventStartTime: '2025-04-23T05:00:00.000Z',
          status: 'running',
          ...runningMaintenanceWindowMock.attributes,
          expirationDate: moment(mockCurrentDate)
            .tz('UTC')
            .endOf('day')
            .add(1, 'year')
            .toISOString(),
          events: [
            {
              gte: '2026-04-23T05:00:00.000Z',
              lte: '2026-04-23T13:00:00.000Z',
            },
          ],
        },
      ]);
    });

    test('should generate events for 2 weeks maintenance window', async () => {
      const totalMWs = await generateEvents({
        maintenanceWindowsSO: [runningMaintenanceWindowMock1],
        startRangeDate: '2025-04-23T09:00:00.000Z',
      });

      expect(totalMWs).toEqual([
        {
          id: '6',
          ...runningMaintenanceWindowMock1.attributes,
          eventEndTime: '2025-04-15T13:00:00.000Z',
          eventStartTime: '2025-04-15T05:00:00.000Z',
          expirationDate: moment(mockCurrentDate)
            .tz('UTC')
            .endOf('day')
            .add(1, 'year')
            .toISOString(),
          events: [
            {
              gte: '2025-04-29T05:00:00.000Z',
              lte: '2025-04-29T13:00:00.000Z',
            },
            {
              gte: '2025-05-06T05:00:00.000Z',
              lte: '2025-05-06T13:00:00.000Z',
            },
            {
              gte: '2025-05-13T05:00:00.000Z',
              lte: '2025-05-13T13:00:00.000Z',
            },
            {
              gte: '2025-05-20T05:00:00.000Z',
              lte: '2025-05-20T13:00:00.000Z',
            },
            {
              gte: '2025-05-27T05:00:00.000Z',
              lte: '2025-05-27T13:00:00.000Z',
            },
            {
              gte: '2025-06-03T05:00:00.000Z',
              lte: '2025-06-03T13:00:00.000Z',
            },
          ],
          status: 'archived',
        },
      ]);
    });
  });

  describe('updateMaintenanceWindowsEvents', () => {
    test('should not update any maintenance windows when there are none', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [],
      });

      const total = await updateMaintenanceWindowsEvents({
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        soFinder: internalSavedObjectsRepository.createPointInTimeFinder({
          type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
          filter: statusFilter as KueryNode,
        }),
        startRangeDate: '2025-04-23T09:00:00.000Z',
      });

      expect(internalSavedObjectsRepository.bulkUpdate).not.toHaveBeenCalled();
      expect(total).toEqual(0);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "0"`);
    });

    test('should update single maintenance window', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...finishedWithEventsMaintenanceWindowMock,
            attributes: {
              ...finishedWithEventsMaintenanceWindowMock.attributes,
              rRule: { ...finishedWithEventsMaintenanceWindowMock.attributes.rRule, count: 5 },
            },
          },
        ],
      });

      internalSavedObjectsRepository.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '5',
            type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
            attributes: {
              ...finishedWithEventsMaintenanceWindowMock.attributes,
              events: [
                {
                  gte: '2025-04-28T00:00:00.011Z',
                  lte: '2025-04-28T02:00:00.011Z',
                },
              ],
              expirationDate: moment(mockCurrentDate).tz('UTC').add(1, 'year').toISOString(),
            },
            references: [],
          },
        ],
      });
      const total = await updateMaintenanceWindowsEvents({
        soFinder: internalSavedObjectsRepository.createPointInTimeFinder({
          type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
          filter: statusFilter as KueryNode,
        }),
        startRangeDate: '2025-04-23T09:00:00.000Z',
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(internalSavedObjectsRepository.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(internalSavedObjectsRepository.bulkUpdate).toHaveBeenNthCalledWith(1, [
        {
          type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
          id: '5',
          attributes: {
            ...finishedWithEventsMaintenanceWindowMock.attributes,
            rRule: {
              ...finishedWithEventsMaintenanceWindowMock.attributes.rRule,
              count: 5,
            },
            events: [
              {
                gte: '2025-04-28T00:00:00.011Z',
                lte: '2025-04-28T02:00:00.011Z',
              },
            ],
            expirationDate: moment(mockCurrentDate)
              .tz('UTC')
              .endOf('day')
              .add(1, 'year')
              .toISOString(),
          },
        },
      ]);
      expect(total).toEqual(1);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "1"`);
    });

    test('should update multiple maintenance windows with new events', async () => {
      const upcomingMaintenanceWindowAttributes = {
        ...upcomingMaintenanceWindowMock.attributes,
        events: [
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
        expirationDate: moment(mockCurrentDate).tz('UTC').endOf('day').add(1, 'year').toISOString(),
      };

      mockCreatePointInTimeFinderAsInternalUser();

      internalSavedObjectsRepository.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '3',
            type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
            attributes: upcomingMaintenanceWindowAttributes,
            references: [],
          },
          {
            type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
            id: '4',
            attributes: {
              ...runningMaintenanceWindowMock.attributes,
              expirationDate: moment(mockCurrentDate)
                .tz('UTC')
                .endOf('day')
                .add(1, 'year')
                .toISOString(),
              events: [
                {
                  gte: '2026-04-23T05:00:00.000Z',
                  lte: '2026-04-23T13:00:00.000Z',
                },
              ],
            },
            references: [],
          },
        ],
      });

      const total = await updateMaintenanceWindowsEvents({
        soFinder: internalSavedObjectsRepository.createPointInTimeFinder({
          type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
          filter: statusFilter as KueryNode,
        }),
        startRangeDate: '2025-04-23T09:00:00.000Z',
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(internalSavedObjectsRepository.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(internalSavedObjectsRepository.bulkUpdate).toHaveBeenNthCalledWith(1, [
        {
          type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
          id: '3',
          attributes: upcomingMaintenanceWindowAttributes,
        },
        {
          type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
          id: '4',
          attributes: {
            ...runningMaintenanceWindowMock.attributes,
            expirationDate: moment(mockCurrentDate)
              .tz('UTC')
              .endOf('day')
              .add(1, 'year')
              .toISOString(),
            events: [
              {
                gte: '2026-04-23T05:00:00.000Z',
                lte: '2026-04-23T13:00:00.000Z',
              },
            ],
          },
        },
      ]);
      expect(total).toEqual(2);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "2"`);
    });

    test('should handle errors during update', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [runningMaintenanceWindowMock],
      });

      internalSavedObjectsRepository.bulkUpdate.mockRejectedValueOnce(
        new Error('something went wrong')
      );

      const total = await updateMaintenanceWindowsEvents({
        startRangeDate: '2025-05-23T09:00:00.000Z',
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        soFinder: internalSavedObjectsRepository.createPointInTimeFinder({
          type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
          filter: statusFilter as KueryNode,
        }),
      });

      expect(logger.error).toHaveBeenCalledWith(
        'MW event generator: Failed to update events in maintenance windows saved object". Error: something went wrong'
      );
      expect(total).toEqual(0);
      expect(logger.debug).toHaveBeenCalledWith(`Total updated maintenance windows "0"`);
    });

    test('logs error when bulkUpdate returns any errored saved object', async () => {
      mockCreatePointInTimeFinderAsInternalUser();

      internalSavedObjectsRepository.bulkUpdate.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '3',
            type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
          },
          {
            type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
            id: '4',
            error: {
              error: 'NotFound',
              message: 'NotFound',
              statusCode: 404,
            },
            references: [],
            attributes: {},
          },
        ],
      });

      const total = await updateMaintenanceWindowsEvents({
        startRangeDate: '2025-05-23T09:00:00.000Z',
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        soFinder: internalSavedObjectsRepository.createPointInTimeFinder({
          type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
          filter: statusFilter as KueryNode,
        }),
      });

      expect(logger.error).toHaveBeenCalledWith(
        'MW event generator: Failed to update maintenance window "4". Error: NotFound'
      );

      expect(total).toEqual(1);
    });
  });

  describe('createEventsGeneratorTaskRunner', () => {
    it('should log when the task is cancelled', async () => {
      const startDependencies = [
        {
          savedObjectsRepositoryMock: internalSavedObjectsRepository,
        },
      ];
      const getStartServices = jest.fn().mockResolvedValue(startDependencies);
      const mwTask = createEventsGeneratorTaskRunner(logger, getStartServices)();

      await mwTask.run();
      await mwTask.cancel();

      expect(logger.debug).toHaveBeenCalledWith(
        'Cancelling maintenance windows events generator task - execution error due to timeout.'
      );
    });
  });
});
