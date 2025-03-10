/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { groupBy, orderBy } from 'lodash';
import {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
  IngestPutPipelineRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { IngestStreamLifecycle, StreamDefinition } from '@kbn/streams-schema';
import { AssetClient } from '../assets/asset_client';
import { StreamsStorageClient } from '../service';
import {
  deleteComponent,
  upsertComponent,
} from '../component_templates/manage_component_templates';
import { deleteTemplate, upsertTemplate } from '../index_templates/manage_index_templates';
import {
  deleteDataStream,
  updateDataStreamsLifecycle,
  updateOrRolloverDataStream,
  upsertDataStream,
} from '../data_streams/manage_data_streams';
import {
  deleteIngestPipeline,
  upsertIngestPipeline,
} from '../ingest_pipelines/manage_ingest_pipelines';

// A bunch of types to model based on Joe's list
interface UpsertComponentTemplateAction {
  type: 'upsert_component_template';
  request: ClusterPutComponentTemplateRequest;
}

interface UpsertIndexTemplateAction {
  type: 'upsert_index_template';
  request: IndicesPutIndexTemplateRequest;
}

interface UpsertIngestPipelineAction {
  type: 'upsert_ingest_pipeline';
  stream: string;
  request: IngestPutPipelineRequest;
}

interface UpsertDatastreamAction {
  type: 'upsert_datastream';
  request: {
    name: string;
  };
}

interface UpsertWriteIndexOrRolloverAction {
  type: 'upsert_write_index_or_rollover';
  request: {
    name: string;
  };
}

interface UpdateLifecycleAction {
  type: 'update_lifecycle';
  request: {
    name: string;
    lifecycle: IngestStreamLifecycle;
  };
}

interface DeleteComponentTemplateAction {
  type: 'delete_component_template';
  request: {
    name: string;
  };
}

interface DeleteIndexTemplateAction {
  type: 'delete_index_template';
  request: {
    name: string;
  };
}

interface DeleteIngestPipelineAction {
  type: 'delete_ingest_pipeline';
  request: {
    name: string;
  };
}

interface DeleteDatastreamAction {
  type: 'delete_datastream';
  request: {
    name: string;
  };
}

interface UpsertDotStreamsDocumentAction {
  type: 'upsert_dot_streams_document';
  request: StreamDefinition;
}

interface DeleteDotStreamsDocumentAction {
  type: 'delete_dot_streams_document';
  request: {
    name: string;
  };
}

interface SyncAssetListAction {
  type: 'sync_asset_list';
  request: {
    name: string;
    assetIds: string[];
  };
}

export type ElasticsearchAction =
  | UpsertComponentTemplateAction
  | UpsertIndexTemplateAction
  | UpsertIngestPipelineAction
  | UpsertDatastreamAction
  | UpsertWriteIndexOrRolloverAction
  | UpdateLifecycleAction
  | UpsertDotStreamsDocumentAction
  | DeleteDotStreamsDocumentAction
  | DeleteComponentTemplateAction
  | DeleteIndexTemplateAction
  | DeleteIngestPipelineAction
  | DeleteDatastreamAction
  | SyncAssetListAction;

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

  async execute() {
    // Unpack actions by type

    const {
      upsert_component_template,
      upsert_index_template,
      update_lifecycle,
      upsert_datastream,
      upsert_dot_streams_document,
      upsert_ingest_pipeline,
      upsert_write_index_or_rollover,
      sync_asset_list,
      delete_datastream,
      delete_dot_streams_document,
      delete_index_template,
      delete_ingest_pipeline,
      delete_component_template,
      ...rest
    } = this.actionsByType;
    assertEmptyObject(rest);

    // This graph is parallelizing as much as possible
    // It's important we don't changes too early, otherwise things can break halfway through

    await Promise.all([
      this.upsertComponentTemplates(upsert_component_template as UpsertComponentTemplateAction[]),
      this.upsertIndexTemplates(upsert_index_template as UpsertIndexTemplateAction[]),
    ]);
    await Promise.all([
      this.upsertWriteIndexOrRollover(
        upsert_write_index_or_rollover as UpsertWriteIndexOrRolloverAction[]
      ),
      this.updateLifecycle(update_lifecycle as UpdateLifecycleAction[]),
      this.upsertDatastreams(upsert_datastream as UpsertDatastreamAction[]),
    ]);

    await this.upsertIngestPipelines(upsert_ingest_pipeline as UpsertIngestPipelineAction[]);

    await this.deleteDatastreams(delete_datastream as DeleteDatastreamAction[]);

    await this.deleteIndexTemplates(delete_index_template as DeleteIndexTemplateAction[]);

    await Promise.all([
      this.deleteComponentTemplates(delete_component_template as DeleteComponentTemplateAction[]),
      this.deleteIngestPipelines(delete_ingest_pipeline as DeleteIngestPipelineAction[]),
    ]);

    await Promise.all([
      this.syncAssetList(sync_asset_list as SyncAssetListAction[]),
      this.upsertDotStreamsDocuments(
        upsert_dot_streams_document as UpsertDotStreamsDocumentAction[]
      ),
      this.deleteDotStreamsDocuments(
        delete_dot_streams_document as DeleteDotStreamsDocumentAction[]
      ),
    ]);
  }

  private async upsertComponentTemplates(actions: UpsertComponentTemplateAction[] | undefined) {
    return Promise.all(
      actions?.map((action: UpsertComponentTemplateAction) =>
        upsertComponent({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          component: action.request,
        })
      ) ?? []
    );
  }

  private async upsertIndexTemplates(actions: UpsertIndexTemplateAction[] | undefined) {
    return Promise.all(
      actions?.map((action: UpsertIndexTemplateAction) =>
        upsertTemplate({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          template: action.request,
        })
      ) ?? []
    );
  }

  private async updateLifecycle(actions: UpdateLifecycleAction[] | undefined) {
    return Promise.all(
      actions?.map((action: UpdateLifecycleAction) =>
        updateDataStreamsLifecycle({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          names: [action.request.name],
          lifecycle: action.request.lifecycle,
          isServerless: this.dependencies.isServerless,
        })
      ) ?? []
    );
  }

  private async upsertDatastreams(actions: UpsertDatastreamAction[] | undefined) {
    return Promise.all(
      actions?.map((action: UpsertDatastreamAction) =>
        upsertDataStream({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      ) ?? []
    );
  }

  private async upsertDotStreamsDocuments(actions: UpsertDotStreamsDocumentAction[] | undefined) {
    return this.dependencies.storageClient.bulk({
      operations: (actions ?? []).map((action) => ({
        index: {
          document: action.request,
          _id: action.request.name,
        },
      })),
    });
  }

  private async upsertIngestPipelines(actions: UpsertIngestPipelineAction[] | undefined) {
    const actionWithStreamsDepth =
      actions?.map((action) => ({
        ...action,
        depth: action.stream.match(/\./g)?.length ?? 0,
      })) ?? [];
    return Promise.all(
      orderBy(actionWithStreamsDepth, 'depth', 'desc').map((action: UpsertIngestPipelineAction) =>
        upsertIngestPipeline({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          pipeline: action.request,
        })
      )
    );
  }

  private async upsertWriteIndexOrRollover(
    actions: UpsertWriteIndexOrRolloverAction[] | undefined
  ) {
    return Promise.all(
      actions?.map((action: UpsertWriteIndexOrRolloverAction) =>
        updateOrRolloverDataStream({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      ) ?? []
    );
  }

  private async syncAssetList(actions: SyncAssetListAction[] | undefined) {
    return Promise.all(
      actions?.map((action: SyncAssetListAction) =>
        this.dependencies.assetClient.syncAssetList({
          entityId: action.request.name,
          entityType: 'stream',
          assetIds: action.request.assetIds,
          assetType: 'dashboard',
        })
      ) ?? []
    );
  }

  private async deleteDatastreams(actions: DeleteDatastreamAction[] | undefined) {
    return Promise.all(
      actions?.map((action: DeleteDatastreamAction) =>
        deleteDataStream({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      ) ?? []
    );
  }

  private async deleteDotStreamsDocuments(actions: DeleteDotStreamsDocumentAction[] | undefined) {
    return this.dependencies.storageClient.bulk({
      operations: (actions ?? []).map((action) => ({
        delete: {
          _id: action.request.name,
        },
      })),
    });
  }

  private async deleteIndexTemplates(actions: DeleteIndexTemplateAction[] | undefined) {
    return Promise.all(
      actions?.map((action: DeleteIndexTemplateAction) =>
        deleteTemplate({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      ) ?? []
    );
  }

  private async deleteIngestPipelines(actions: DeleteIngestPipelineAction[] | undefined) {
    return Promise.all(
      actions?.map((action: DeleteIngestPipelineAction) =>
        deleteIngestPipeline({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          id: action.request.name,
        })
      ) ?? []
    );
  }

  private async deleteComponentTemplates(actions: DeleteComponentTemplateAction[] | undefined) {
    return Promise.all(
      actions?.map((action: DeleteComponentTemplateAction) =>
        deleteComponent({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      ) ?? []
    );
  }
}

function assertEmptyObject(object: Record<string, never>) {
  // This is for type checking only
}
