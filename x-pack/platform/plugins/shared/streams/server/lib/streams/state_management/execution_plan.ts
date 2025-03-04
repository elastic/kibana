/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { Logger } from 'elastic-apm-node';
import { groupBy } from 'lodash';
import { AssetClient } from '../assets/asset_client';
import { StreamsStorageClient } from '../service';

// A bunch of types to model based on Joe's list
interface UpsertComponentTemplateAction {
  type: 'upsert_component_template';
}

interface UpsertIndexTemplateAction {
  type: 'upsert_index_template';
}

export type ElasticsearchAction = UpsertComponentTemplateAction | UpsertIndexTemplateAction;

type ActionsByType = {
  [Type in ElasticsearchAction['type']]: ElasticsearchAction[] | undefined;
};

interface ExecutionPlanDependencies {
  scopedClusterClient: IScopedClusterClient;
  assetClient: AssetClient;
  storageClient: StreamsStorageClient;
  logger: Logger;
  isServerless: boolean;
}

export class ExecutionPlan {
  private dependencies: ExecutionPlanDependencies;
  private actionsByType: ActionsByType = {} as ActionsByType;

  constructor(dependencies: ExecutionPlanDependencies) {
    this.dependencies = dependencies;
  }

  plan(elasticsearchActions: ElasticsearchAction[]) {
    this.actionsByType = groupBy(elasticsearchActions, 'type') as ActionsByType;
  }

  execute() {
    // Unpack actions by type
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { upsert_component_template, upsert_index_template, ...rest } = this.actionsByType;
    assertEmptyObject(rest);

    // Execute actions in the appropriate order
    if (upsert_component_template) {
      this.upsertComponentTemplates(upsert_component_template);
    }

    if (upsert_index_template) {
      this.upsertIndexTemplates(upsert_index_template);
    }
  }

  private upsertComponentTemplates(actions: ElasticsearchAction[]) {
    // Bulk em
  }

  private upsertIndexTemplates(actions: ElasticsearchAction[]) {
    // Bulk em
  }
}

function assertEmptyObject(object: Record<string, never>) {
  // This is for type checking only
}
