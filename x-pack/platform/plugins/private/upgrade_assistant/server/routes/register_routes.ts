/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../types';

import { registerAppRoutes } from './app';
import { registerCloudBackupStatusRoutes } from './cloud_backup_status';
import { registerClusterUpgradeStatusRoutes } from './cluster_upgrade_status';
import { registerSystemIndicesMigrationRoutes } from './system_indices_migration';
import { registerESDeprecationRoutes } from './es_deprecations';
import { registerDeprecationLoggingRoutes } from './deprecation_logging';
import { registerReindexIndicesRoutes, registerBatchReindexIndicesRoutes } from './reindex_indices';
import { registerUpdateSettingsRoute } from './update_index_settings';
import { registerMlSnapshotRoutes } from './ml_snapshots';
import { ReindexWorker } from '../lib/reindexing';
import { registerUpgradeStatusRoute } from './status';
import { registerRemoteClustersRoute } from './remote_clusters';
import { registerNodeDiskSpaceRoute } from './node_disk_space';
import { registerClusterSettingsRoute } from './cluster_settings';
import { registerReindexDataStreamRoutes } from './reindex_data_streams';

export function registerRoutes(dependencies: RouteDependencies, getWorker: () => ReindexWorker) {
  registerAppRoutes(dependencies);

  registerCloudBackupStatusRoutes(dependencies);
  registerClusterUpgradeStatusRoutes(dependencies);
  registerSystemIndicesMigrationRoutes(dependencies);
  registerESDeprecationRoutes(dependencies);
  registerDeprecationLoggingRoutes(dependencies);
  registerReindexIndicesRoutes(dependencies, getWorker);
  registerBatchReindexIndicesRoutes(dependencies, getWorker);
  registerUpdateSettingsRoute(dependencies);
  registerMlSnapshotRoutes(dependencies);
  // Route for cloud to retrieve the upgrade status for ES and Kibana
  registerUpgradeStatusRoute(dependencies);
  registerRemoteClustersRoute(dependencies);
  registerNodeDiskSpaceRoute(dependencies);
  registerClusterSettingsRoute(dependencies);

  // Data streams reindexing
  registerReindexDataStreamRoutes(dependencies);
}
