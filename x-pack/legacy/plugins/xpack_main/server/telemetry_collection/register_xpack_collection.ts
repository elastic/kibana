/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { telemetryCollectionManager } from '../../../../../../src/legacy/core_plugins/telemetry/server';
import { getClusterUuids } from '../../../../../../src/legacy/core_plugins/telemetry/server/telemetry_collection';
import { getStatsWithXpack } from './get_stats_with_xpack';

export function registerMonitoringCollection() {
  telemetryCollectionManager.setCollection({
    esCluster: 'data',
    title: 'local_xpack',
    priority: 1,
    statsGetter: getStatsWithXpack,
    clusterDetailsGetter: getClusterUuids,
  });
}
