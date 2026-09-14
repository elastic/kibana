/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { serviceMapRoute } from './service_map';
import { serviceMapDependencyNodeRoute } from './dependency_node';
import { serviceMapServiceBadgesRoute } from './service_badges';

export const serviceMapRouteDefinitions = {
  serviceMap: serviceMapRoute,
  dependencyNode: serviceMapDependencyNodeRoute,
  serviceBadges: serviceMapServiceBadgesRoute,
};

export type { ServiceMapRouteResponse } from './service_map';
export type { ServiceMapServiceDependencyInfoResponse } from './dependency_node';
export type { ServiceSloStatsResponse, ServiceMapServiceBadgesResponse } from './service_badges';
