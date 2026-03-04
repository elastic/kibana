/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActiveMaintenanceWindows } from './get_active_maintenance_windows';
import { toElasticsearchQuery } from '@kbn/es-query';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import type { MaintenanceWindowClientContext } from '../../../../common';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../../../common';
import { getMockMaintenanceWindow } from '../../../data/test_helpers';

const savedObjectsClient = savedObjectsClientMock.create();
const uiSettings = uiSettingsServiceMock.createClient();

const mockContext: jest.Mocked<MaintenanceWindowClientContext> = {
  logger: loggingSystemMock.create().get(),
  getModificationMetadata: jest.fn(),
  savedObjectsClient,
  uiSettings,
};

describe('MaintenanceWindowClient - getActiveMaintenanceWindows', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should return active maintenance windows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: getMockMaintenanceWindow({ expirationDate: new Date().toISOString() }),
          id: 'test-1',
        },
        {
          attributes: getMockMaintenanceWindow({ expirationDate: new Date().toISOString() }),
          id: 'test-2',
        },
      ],
    } as unknown as SavedObjectsFindResponse);

    const result = await getActiveMaintenanceWindows(mockContext);

    const findCallParams = savedObjectsClient.find.mock.calls[0][0];

    expect(findCallParams.type).toEqual(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE);

    expect(toElasticsearchQuery(findCallParams.filter)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "maintenance-window.attributes.events": "2023-02-26T00:00:00.000Z",
                    },
                  },
                ],
              },
            },
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "maintenance-window.attributes.enabled": "true",
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'test-1',
      }),
      expect.objectContaining({
        id: 'test-2',
      }),
    ]);
  });

  it('should use cacheInterval if provided', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: getMockMaintenanceWindow({ expirationDate: new Date().toISOString() }),
          id: 'test-1',
        },
        {
          attributes: getMockMaintenanceWindow({ expirationDate: new Date().toISOString() }),
          id: 'test-2',
        },
      ],
    } as unknown as SavedObjectsFindResponse);

    const result = await getActiveMaintenanceWindows(mockContext, 60000);

    const findCallParams = savedObjectsClient.find.mock.calls[0][0];

    expect(findCallParams.type).toEqual(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE);

    expect(toElasticsearchQuery(findCallParams.filter)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "maintenance-window.attributes.events": "2023-02-26T00:00:00.000Z",
                          },
                        },
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "minimum_should_match": 1,
                      "should": Array [
                        Object {
                          "match": Object {
                            "maintenance-window.attributes.events": "2023-02-26T00:01:00.000Z",
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "maintenance-window.attributes.enabled": "true",
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'test-1',
      }),
      expect.objectContaining({
        id: 'test-2',
      }),
    ]);
  });

  it('should return empty array if there are no active maintenance windows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [],
    } as unknown as SavedObjectsFindResponse);

    const result = await getActiveMaintenanceWindows(mockContext);

    const findCallParams = savedObjectsClient.find.mock.calls[0][0];

    expect(findCallParams.type).toEqual(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE);
    expect(toElasticsearchQuery(findCallParams.filter)).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "maintenance-window.attributes.events": "2023-02-26T00:00:00.000Z",
                    },
                  },
                ],
              },
            },
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "should": Array [
                  Object {
                    "match": Object {
                      "maintenance-window.attributes.enabled": "true",
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);
    expect(result).toEqual([]);
  });

  it('should return all active maintenance windows when SO find response is paginated', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    const firstPageSavedObjects = Array.from({ length: 20 }, (_, i) => ({
      attributes: getMockMaintenanceWindow({ expirationDate: new Date().toISOString() }),
      id: `test-${i + 1}`,
    }));
    const secondPageSavedObjects = Array.from({ length: 15 }, (_, i) => ({
      attributes: getMockMaintenanceWindow({ expirationDate: new Date().toISOString() }),
      id: `test-${i + 21}`,
    }));

    savedObjectsClient.find.mockResolvedValueOnce({
      page: 1,
      per_page: 1000,
      total: 35,
      saved_objects: firstPageSavedObjects,
    } as unknown as SavedObjectsFindResponse);
    savedObjectsClient.find.mockResolvedValueOnce({
      page: 2,
      per_page: 1000,
      total: 35,
      saved_objects: secondPageSavedObjects,
    } as unknown as SavedObjectsFindResponse);

    const result = await getActiveMaintenanceWindows(mockContext);

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(2);
    expect(savedObjectsClient.find.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        page: 1,
        perPage: 1000,
      })
    );
    expect(savedObjectsClient.find.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        page: 2,
        perPage: 1000,
      })
    );
    expect(result).toHaveLength(35);
    expect(result.map((mw) => mw.id)).toEqual(
      [...firstPageSavedObjects, ...secondPageSavedObjects].map((savedObject) => savedObject.id)
    );
  });

  it('should log and throw if an error is thrown', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockRejectedValueOnce('something went wrong');

    await expect(async () => {
      await getActiveMaintenanceWindows(mockContext);
    }).rejects.toThrowError();

    expect(mockContext.logger.error).toHaveBeenLastCalledWith(
      'Failed to find active maintenance window by interval, Error: something went wrong'
    );
  });
});
