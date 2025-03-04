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
import { ElasticsearchAction } from './stream_active_record';

interface ExecutionPlanDependencies {
  scopedClusterClient: IScopedClusterClient;
  assetClient: AssetClient;
  storageClient: StreamsStorageClient;
  logger: Logger;
  isServerless: boolean;
}

export class ExecutionPlan {
  private dependencies: ExecutionPlanDependencies;

  constructor(dependencies: ExecutionPlanDependencies) {
    this.dependencies = dependencies;
  }

  plan(elasticsearchActions: ElasticsearchAction[]) {
    throw new Error('Method not implemented.');
  }

  execute() {
    throw new Error('Method not implemented.');

    // protected async doCommitUpsert(): Promise<void> {
    //   await this.dependencies.storageClient.index({
    //     id: this.definition.name,
    //     document: this.definition,
    //   });

    //   await syncWiredStreamDefinitionObjects({
    //     definition: this.definition,
    //     logger: this.dependencies.logger,
    //     scopedClusterClient: this.dependencies.scopedClusterClient,
    //     isServerless: this.dependencies.isServerless,
    //   });
    //   // Also update lifecycle

    //   // Update assets
    // }

    // protected async doCommitDelete(): Promise<void> {
    //   await deleteStreamObjects({
    //     name: this.definition.name,
    //     scopedClusterClient: this.dependencies.scopedClusterClient,
    //     logger: this.dependencies.logger,
    //   });

    //   // Update assets

    //   await this.dependencies.storageClient.delete({ id: this.definition.name });
    // }
  }
}
