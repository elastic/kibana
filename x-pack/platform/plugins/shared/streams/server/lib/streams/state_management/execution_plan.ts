/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { Logger } from 'elastic-apm-node';
import { AssetClient } from '../assets/asset_client';
import { StreamsStorageClient } from '../service';

// A bunch of types to model based on Joe's list
type ActionType = 'upsert_component_template';

export interface ElasticsearchAction {
  type: ActionType;
}

interface ExecutionPlanDependencies {
  scopedClusterClient: IScopedClusterClient;
  assetClient: AssetClient;
  storageClient: StreamsStorageClient;
  logger: Logger;
  isServerless: boolean;
}

export class ExecutionPlan {
  private dependencies: ExecutionPlanDependencies;
  private actions: ElasticsearchAction[] = [];

  constructor(dependencies: ExecutionPlanDependencies) {
    this.dependencies = dependencies;
  }

  plan(elasticsearchActions: ElasticsearchAction[]) {
    this.actions = elasticsearchActions;
  }

  execute() {
    // To do
  }
}
