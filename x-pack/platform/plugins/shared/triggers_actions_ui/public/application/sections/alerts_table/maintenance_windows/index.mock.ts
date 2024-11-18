/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MaintenanceWindowStatus } from '@kbn/alerting-plugin/common';

const mockMaintenanceWindow = {
  id: 'test-mw-id-1',
  title: 'test-title',
  duration: 60 * 60 * 1000,
  enabled: true,
  rRule: {
    tzid: 'UTC',
    dtstart: '2023-02-26T00:00:00.000Z',
    freq: 2 as const,
    count: 2,
  },
  status: MaintenanceWindowStatus.Running,
  eventStartTime: '2023-03-05T00:00:00.000Z',
  eventEndTime: '2023-03-05T01:00:00.000Z',
  events: [
    {
      gte: '2023-02-26T00:00:00.000Z',
      lte: '2023-02-26T01:00:00.000Z',
    },
    {
      gte: '2023-03-05T00:00:00.000Z',
      lte: '2023-03-05T01:00:00.000Z',
    },
  ],
  createdAt: '2023-02-26T00:00:00.000Z',
  updatedAt: '2023-02-26T00:00:00.000Z',
  createdBy: 'test-user',
  updatedBy: 'test-user',
  expirationDate: '2024-02-26T00:00:00.000Z',
};

export const getMaintenanceWindowsMock = () => {
  return [
    mockMaintenanceWindow,
    {
      ...mockMaintenanceWindow,
      id: 'test-mw-id-2',
      title: 'test-title-2',
    },
  ];
};

export const getMaintenanceWindowsMapMock = () =>
  getMaintenanceWindowsMock().reduce((acc, val) => acc.set(val.id, val), new Map());
