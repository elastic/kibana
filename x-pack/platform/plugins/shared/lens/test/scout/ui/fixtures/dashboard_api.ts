/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

const DASHBOARD_API_PATH = '/api/dashboards';
const DASHBOARD_API_VERSION = '2023-10-31';

export const LOGSTASH_TIME_RANGE = {
  from: '2015-09-19T06:31:44.000Z',
  to: '2015-09-23T18:31:44.000Z',
};

export const withSpace = (path: string, spaceId: string): string => `/s/${spaceId}${path}`;

/**
 * Create a dashboard via the API and return its id.
 */
export const createDashboard = async (
  client: KbnClient,
  body: unknown,
  spaceId: string
): Promise<string> => {
  const response = await client.request<unknown>({
    method: 'POST',
    path: withSpace(DASHBOARD_API_PATH, spaceId),
    body,
    headers: { 'elastic-api-version': DASHBOARD_API_VERSION },
  });

  if (response.status !== 201) {
    throw new Error(
      `Expected dashboard create status 201, got ${response.status}: ${JSON.stringify(
        response.data
      )}`
    );
  }

  const { id } = response.data as Record<string, unknown>;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Dashboard create response: expected a non-empty string id');
  }
  return id;
};

/**
 * Create a dashboard and fetch the auto-generated panel ID of its first panel.
 */
export const createDashboardWithPanelId = async (
  client: KbnClient,
  body: unknown,
  spaceId: string
): Promise<{ dashboardId: string; panelId: string }> => {
  const dashboardId = await createDashboard(client, body, spaceId);

  const getResponse = await client.request<unknown>({
    method: 'GET',
    path: withSpace(`${DASHBOARD_API_PATH}/${dashboardId}`, spaceId),
    headers: { 'elastic-api-version': DASHBOARD_API_VERSION },
  });

  const data = (getResponse.data as Record<string, unknown>).data as Record<string, unknown>;
  const panels = data.panels as Array<Record<string, unknown>>;
  const panelId = panels[0].id as string;

  return { dashboardId, panelId };
};
