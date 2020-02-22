/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { telemetryCollectionManager } from '../../../../../../src/legacy/core_plugins/telemetry/server';
import { getAllStats } from './get_all_stats';
import { getClusterUuids } from './get_cluster_uuids';

export function registerMonitoringCollection() {
  telemetryCollectionManager.setCollection({
    esCluster: 'monitoring',
    title: 'monitoring',
    priority: 2,
    statsGetter: getAllStats,
    clusterDetailsGetter: getClusterUuids,
  });
}
