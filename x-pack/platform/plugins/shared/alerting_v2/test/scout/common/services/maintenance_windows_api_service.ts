/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import {
  BASE_MAINTENANCE_WINDOW_API_PATH,
  type ExternalCreateMaintenanceWindowRequestBody,
  type ExternalFindMaintenanceWindowsResponse,
  type ExternalMaintenanceWindowResponse,
} from '@kbn/maintenance-windows-plugin/common';
import { COMMON_HEADERS } from '../constants';

const FIND_PATH = `${BASE_MAINTENANCE_WINDOW_API_PATH}/_find`;
const FIND_PAGE_SIZE = 100;

/**
 * Test-time accessor for Kibana's public maintenance windows REST API.
 */
export interface MaintenanceWindowsApiService {
  create: (
    data: ExternalCreateMaintenanceWindowRequestBody
  ) => Promise<ExternalMaintenanceWindowResponse>;
  delete: (id: string) => Promise<void>;
  list: () => Promise<ExternalMaintenanceWindowResponse[]>;
  cleanUp: () => Promise<void>;
}

export const getMaintenanceWindowsApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): MaintenanceWindowsApiService => {
  const list: MaintenanceWindowsApiService['list'] = () =>
    measurePerformanceAsync(log, 'maintenanceWindows.list', async () => {
      const response = await kbnClient.request<ExternalFindMaintenanceWindowsResponse>({
        method: 'GET',
        path: FIND_PATH,
        query: { per_page: FIND_PAGE_SIZE },
      });
      return response.data.maintenanceWindows;
    });

  const deleteWindow: MaintenanceWindowsApiService['delete'] = (id) =>
    measurePerformanceAsync(log, 'maintenanceWindows.delete', async () => {
      await kbnClient.request({
        method: 'DELETE',
        path: `${BASE_MAINTENANCE_WINDOW_API_PATH}/${encodeURIComponent(id)}`,
        headers: COMMON_HEADERS,
        ignoreErrors: [404],
        retries: 0,
      });
    });

  return {
    create: (data) =>
      measurePerformanceAsync(log, 'maintenanceWindows.create', async () => {
        const response = await kbnClient.request<ExternalMaintenanceWindowResponse>({
          method: 'POST',
          path: BASE_MAINTENANCE_WINDOW_API_PATH,
          headers: COMMON_HEADERS,
          body: data,
        });
        return response.data;
      }),

    delete: deleteWindow,
    list,

    cleanUp: () =>
      measurePerformanceAsync(log, 'maintenanceWindows.cleanUp', async () => {
        while (true) {
          const windows = await list();
          if (windows.length === 0) return;
          await Promise.all(windows.map((mw) => deleteWindow(mw.id)));
        }
      }),
  };
};
