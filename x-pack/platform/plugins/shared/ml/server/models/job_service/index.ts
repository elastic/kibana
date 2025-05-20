/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { MlClient } from '@kbn/ml-client';
import { datafeedsProvider } from '@kbn/ml-services/datafeeds';

import { jobsProvider } from './jobs';
import { groupsProvider } from './groups';
import { newJobCapsProvider } from './new_job_caps';
import { newJobChartsProvider, topCategoriesProvider } from './new_job';
import { modelSnapshotProvider } from './model_snapshots';

export function jobServiceProvider(
  client: IScopedClusterClient,
  mlClient: MlClient,
  rulesClient?: RulesClient
) {
  return {
    ...datafeedsProvider(client, mlClient),
    ...jobsProvider(client, mlClient, rulesClient),
    ...groupsProvider(mlClient),
    ...newJobCapsProvider(client),
    ...newJobChartsProvider(client),
    ...topCategoriesProvider(mlClient),
    ...modelSnapshotProvider(client, mlClient),
  };
}
