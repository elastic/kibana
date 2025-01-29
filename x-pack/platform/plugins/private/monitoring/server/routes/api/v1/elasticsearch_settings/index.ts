/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCore, RouteDependencies } from '../../../../types';
import { clusterSettingsCheckRoute } from './check/cluster';
import { internalMonitoringCheckRoute } from './check/internal_monitoring';
import { nodesSettingsCheckRoute } from './check/nodes';
import { setCollectionEnabledRoute } from './set/collection_enabled';
import { setCollectionIntervalRoute } from './set/collection_interval';

export function registerV1ElasticsearchSettingsRoutes(
  server: MonitoringCore,
  npRoute: RouteDependencies
) {
  clusterSettingsCheckRoute(server);
  internalMonitoringCheckRoute(server, npRoute);
  nodesSettingsCheckRoute(server);
  setCollectionEnabledRoute(server);
  setCollectionIntervalRoute(server);
}
