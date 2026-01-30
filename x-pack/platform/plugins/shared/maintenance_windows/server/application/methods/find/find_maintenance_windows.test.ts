/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findMaintenanceWindows, getStatusFilter } from './find_maintenance_windows';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import type { MaintenanceWindowClientContext, MaintenanceWindowStatus } from '../../../../common';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../../../common';
import { getMockMaintenanceWindow } from '../../../data/test_helpers';
import { findMaintenanceWindowsParamsSchema } from './schemas';

const savedObjectsClient = savedObjectsClientMock.create();
const uiSettings = uiSettingsServiceMock.createClient();

const mockContext: jest.Mocked<MaintenanceWindowClientContext> = {
  logger: loggingSystemMock.create().get(),
  getModificationMetadata: jest.fn(),
  savedObjectsClient,
  uiSettings,
};

describe('MaintenanceWindowClient - find', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('throws an error if page is string', async () => {
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
      page: 1,
      per_page: 5,
    } as unknown as SavedObjectsFindResponse);

    await expect(
      // @ts-expect-error: testing validation of strings
      findMaintenanceWindows(mockContext, { page: 'dfsd', perPage: 10 })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Error validating find maintenance windows data - [page]: expected value of type [number] but got [string]"'
    );
  });

  it('throws an error if savedObjectsClient.find will throw an error', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));

    savedObjectsClient.find.mockImplementation(() => {
      throw new Error('something went wrong!');
    });

    await expect(
      findMaintenanceWindows(mockContext, { page: 1, perPage: 10 })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Failed to find maintenance window, Error: Error: something went wrong!: something went wrong!"'
    );
  });

  it('should find maintenance windows', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));
    const spy = jest.spyOn(findMaintenanceWindowsParamsSchema, 'validate');

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
      page: 1,
      per_page: 5,
    } as unknown as SavedObjectsFindResponse);

    const result = await findMaintenanceWindows(mockContext, {
      status: ['running'],
      searchFields: ['title'],
      search: 'some title',
    });

    expect(spy).toHaveBeenCalledWith({
      status: ['running'],
      search: 'some title',
      searchFields: ['title'],
    });
    expect(savedObjectsClient.find).toHaveBeenLastCalledWith({
      filter: {
        arguments: [
          {
            isQuoted: false,
            type: 'literal',
            value: 'maintenance-window.attributes.events',
          },
          {
            isQuoted: true,
            type: 'literal',
            value: 'now',
          },
        ],
        function: 'is',
        type: 'function',
      },
      search: 'some title',
      searchFields: ['title'],
      sortField: 'updatedAt',
      sortOrder: 'desc',
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
    });

    expect(result.data.length).toEqual(2);
    expect(result.data[0].id).toEqual('test-1');
    expect(result.data[1].id).toEqual('test-2');
    expect(result.page).toEqual(1);
    expect(result.perPage).toEqual(5);
  });
});

describe('getStatusFilter', () => {
  it('return proper filter for running status', () => {
    expect(getStatusFilter(['running'])).toMatchInlineSnapshot(`
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
      }
    `);
  });

  it('return proper filter for upcomimg status', () => {
    expect(getStatusFilter(['upcoming'])).toMatchInlineSnapshot(`
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
      }
    `);
  });

  it('return proper filter for fininshed status', () => {
    expect(getStatusFilter(['finished'])).toMatchInlineSnapshot(`
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
      }
    `);
  });

  it('return proper filter for archived status', () => {
    expect(getStatusFilter(['archived'])).toMatchInlineSnapshot(`
      Object {
        "arguments": Array [
          Object {
            "isQuoted": false,
            "type": "literal",
            "value": "maintenance-window.attributes.expirationDate",
          },
          "lt",
          Object {
            "isQuoted": true,
            "type": "literal",
            "value": "now",
          },
        ],
        "function": "range",
        "type": "function",
      }
    `);
  });

  it('return empty string if status does not exist', () => {
    expect(getStatusFilter(['weird' as MaintenanceWindowStatus])).toBeUndefined();
  });

  it('return empty string if pass empty arguments', () => {
    expect(getStatusFilter()).toBeUndefined();
  });

  it('return empty string if pass empty array', () => {
    expect(getStatusFilter([])).toBeUndefined();
  });
});
