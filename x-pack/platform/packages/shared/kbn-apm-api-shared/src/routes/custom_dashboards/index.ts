/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { saveServiceDashboardRoute } from './save_service_dashboard';
import { getServiceDashboardsRoute } from './get_service_dashboards';
import { deleteServiceDashboardRoute } from './delete_service_dashboard';

export const customDashboardsRouteDefinitions = {
  saveServiceDashboard: saveServiceDashboardRoute,
  getServiceDashboards: getServiceDashboardsRoute,
  deleteServiceDashboard: deleteServiceDashboardRoute,
};

export type { SaveServiceDashboardResponse } from './save_service_dashboard';
export type { GetServiceDashboardsResponse } from './get_service_dashboards';
