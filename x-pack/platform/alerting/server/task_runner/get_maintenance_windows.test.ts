/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { maintenanceWindowCategoryIdTypes } from '../application/maintenance_window/constants';
import { getMockMaintenanceWindow } from '../data/maintenance_window/test_helpers';
import { maintenanceWindowClientMock } from '../maintenance_window_client.mock';
import { MaintenanceWindowStatus } from '../types';
import { MaintenanceWindow } from '../application/maintenance_window/types';
import { mockedRawRuleSO, mockedRule } from './fixtures';
import {
  filterMaintenanceWindows,
  filterMaintenanceWindowsIds,
  getMaintenanceWindows,
} from './get_maintenance_windows';
import { getFakeKibanaRequest } from './rule_loader';
import { TaskRunnerContext } from './types';

const logger = loggingSystemMock.create().get();
const mockBasePathService = { set: jest.fn() };
const maintenanceWindowClient = maintenanceWindowClientMock.create();

const apiKey = mockedRawRuleSO.attributes.apiKey!;
const ruleId = mockedRule.id;
const ruleTypeId = mockedRule.alertTypeId;

describe('getMaintenanceWindows', () => {
  let context: TaskRunnerContext;
  let fakeRequest: CoreKibanaRequest;
  let contextMock: ReturnType<typeof getTaskRunnerContext>;

  beforeEach(() => {
    jest.resetAllMocks();
    contextMock = getTaskRunnerContext();
    context = contextMock as unknown as TaskRunnerContext;
    fakeRequest = getFakeKibanaRequest(context, 'default', apiKey);
  });

  test('returns active maintenance windows if they exist', async () => {
    const mockMaintenanceWindows = [
      {
        ...getMockMaintenanceWindow(),
        eventStartTime: new Date().toISOString(),
        eventEndTime: new Date().toISOString(),
        status: MaintenanceWindowStatus.Running,
        id: 'test-id1',
      },
      {
        ...getMockMaintenanceWindow(),
        eventStartTime: new Date().toISOString(),
        eventEndTime: new Date().toISOString(),
        status: MaintenanceWindowStatus.Running,
        id: 'test-id2',
      },
    ];
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(
      mockMaintenanceWindows
    );
    expect(
      await getMaintenanceWindows({
        context,
        fakeRequest,
        logger,
        ruleTypeId,
        ruleTypeCategory: 'observability',
        ruleId,
      })
    ).toEqual(mockMaintenanceWindows);
  });

  test('filters to rule type category if category IDs array exists', async () => {
    const mockMaintenanceWindows = [
      {
        ...getMockMaintenanceWindow(),
        eventStartTime: new Date().toISOString(),
        eventEndTime: new Date().toISOString(),
        status: MaintenanceWindowStatus.Running,
        id: 'test-id1',
        categoryIds: [maintenanceWindowCategoryIdTypes.OBSERVABILITY],
      },
      {
        ...getMockMaintenanceWindow(),
        eventStartTime: new Date().toISOString(),
        eventEndTime: new Date().toISOString(),
        status: MaintenanceWindowStatus.Running,
        id: 'test-id2',
        categoryIds: [maintenanceWindowCategoryIdTypes.SECURITY_SOLUTION],
      },
    ];
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(
      mockMaintenanceWindows
    );
    expect(
      await getMaintenanceWindows({
        context,
        fakeRequest,
        logger,
        ruleTypeId,
        ruleTypeCategory: 'observability',
        ruleId,
      })
    ).toEqual([mockMaintenanceWindows[0]]);
  });

  test('filters to rule type category and no category IDs', async () => {
    const mockMaintenanceWindows = [
      {
        ...getMockMaintenanceWindow(),
        eventStartTime: new Date().toISOString(),
        eventEndTime: new Date().toISOString(),
        status: MaintenanceWindowStatus.Running,
        id: 'test-id1',
        categoryIds: [maintenanceWindowCategoryIdTypes.OBSERVABILITY],
      },
      {
        ...getMockMaintenanceWindow(),
        eventStartTime: new Date().toISOString(),
        eventEndTime: new Date().toISOString(),
        status: MaintenanceWindowStatus.Running,
        id: 'test-id2',
        categoryIds: [maintenanceWindowCategoryIdTypes.SECURITY_SOLUTION],
      },
      {
        ...getMockMaintenanceWindow(),
        eventStartTime: new Date().toISOString(),
        eventEndTime: new Date().toISOString(),
        status: MaintenanceWindowStatus.Running,
        id: 'test-id3',
      },
    ];
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce(
      mockMaintenanceWindows
    );
    expect(
      await getMaintenanceWindows({
        context,
        fakeRequest,
        logger,
        ruleTypeId,
        ruleTypeCategory: 'observability',
        ruleId,
      })
    ).toEqual([mockMaintenanceWindows[0], mockMaintenanceWindows[2]]);
  });

  test('returns empty array if no active maintenance windows exist', async () => {
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValueOnce([]);
    expect(
      await getMaintenanceWindows({
        context,
        fakeRequest,
        logger,
        ruleTypeId,
        ruleTypeCategory: 'observability',
        ruleId,
      })
    ).toEqual([]);
  });

  test('logs error if error loading maintenance window but does not throw', async () => {
    maintenanceWindowClient.getActiveMaintenanceWindows.mockImplementationOnce(() => {
      throw new Error('fail fail');
    });
    expect(
      await getMaintenanceWindows({
        context,
        fakeRequest,
        logger,
        ruleTypeId,
        ruleTypeCategory: 'observability',
        ruleId,
      })
    ).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      `error getting active maintenance window for test:1 fail fail`
    );
  });
});

describe('filterMaintenanceWindows', () => {
  const mockMaintenanceWindows: MaintenanceWindow[] = [
    {
      ...getMockMaintenanceWindow(),
      eventStartTime: new Date().toISOString(),
      eventEndTime: new Date().toISOString(),
      status: MaintenanceWindowStatus.Running,
      id: 'test-id1',
      scopedQuery: {
        kql: "_id: '1234'",
        filters: [
          {
            meta: {
              disabled: false,
              negate: false,
              alias: null,
              key: 'kibana.alert.action_group',
              field: 'kibana.alert.action_group',
              params: {
                query: 'test',
              },
              type: 'phrase',
            },
            $state: {
              store: 'appState',
            },
            query: {
              match_phrase: {
                'kibana.alert.action_group': 'test',
              },
            },
          },
        ],
      },
    },
    {
      ...getMockMaintenanceWindow(),
      eventStartTime: new Date().toISOString(),
      eventEndTime: new Date().toISOString(),
      status: MaintenanceWindowStatus.Running,
      id: 'test-id2',
    },
    {
      ...getMockMaintenanceWindow(),
      eventStartTime: new Date().toISOString(),
      eventEndTime: new Date().toISOString(),
      status: MaintenanceWindowStatus.Running,
      id: 'test-id3',
    },
  ];
  test('correctly filters maintenance windows when withScopedQuery = true', () => {
    expect(
      filterMaintenanceWindows({
        maintenanceWindows: mockMaintenanceWindows,
        withScopedQuery: true,
      })
    ).toEqual([mockMaintenanceWindows[0]]);
  });
  test('correctly filters maintenance windows when withScopedQuery = false', () => {
    expect(
      filterMaintenanceWindows({
        maintenanceWindows: mockMaintenanceWindows,
        withScopedQuery: false,
      })
    ).toEqual([mockMaintenanceWindows[1], mockMaintenanceWindows[2]]);
  });
});

describe('filterMaintenanceWindowsIds', () => {
  const mockMaintenanceWindows: MaintenanceWindow[] = [
    {
      ...getMockMaintenanceWindow(),
      eventStartTime: new Date().toISOString(),
      eventEndTime: new Date().toISOString(),
      status: MaintenanceWindowStatus.Running,
      id: 'test-id1',
      scopedQuery: {
        kql: "_id: '1234'",
        filters: [
          {
            meta: {
              disabled: false,
              negate: false,
              alias: null,
              key: 'kibana.alert.action_group',
              field: 'kibana.alert.action_group',
              params: {
                query: 'test',
              },
              type: 'phrase',
            },
            $state: {
              store: 'appState',
            },
            query: {
              match_phrase: {
                'kibana.alert.action_group': 'test',
              },
            },
          },
        ],
      },
    },
    {
      ...getMockMaintenanceWindow(),
      eventStartTime: new Date().toISOString(),
      eventEndTime: new Date().toISOString(),
      status: MaintenanceWindowStatus.Running,
      id: 'test-id2',
    },
    {
      ...getMockMaintenanceWindow(),
      eventStartTime: new Date().toISOString(),
      eventEndTime: new Date().toISOString(),
      status: MaintenanceWindowStatus.Running,
      id: 'test-id3',
    },
  ];
  test('correctly filters maintenance windows when withScopedQuery = true', () => {
    expect(
      filterMaintenanceWindowsIds({
        maintenanceWindows: mockMaintenanceWindows,
        withScopedQuery: true,
      })
    ).toEqual(['test-id1']);
  });
  test('correctly filters maintenance windows when withScopedQuery = false', () => {
    expect(
      filterMaintenanceWindowsIds({
        maintenanceWindows: mockMaintenanceWindows,
        withScopedQuery: false,
      })
    ).toEqual(['test-id2', 'test-id3']);
  });
});

function getTaskRunnerContext() {
  return {
    basePathService: mockBasePathService,
    getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
  };
}
