/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestPartitionsRoute } from './suggest_partitions_route';
import { suggestProcessingPipelineRoute } from './suggest_processing_pipeline_route';
import { unmanagedAssetsRoute } from './unmanaged_assets_route';

export const internalManagementRoutes = {
  ...unmanagedAssetsRoute,
  ...suggestPartitionsRoute,
  ...suggestProcessingPipelineRoute,
};
