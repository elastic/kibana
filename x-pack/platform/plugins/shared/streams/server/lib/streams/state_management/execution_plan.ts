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
  IngestProcessorContainer,
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
import { translateUnwiredStreamPipelineActions } from './translate_unwired_stream_pipeline_actions';
import { FailedToPlanElasticsearchActionsError } from './errors/failed_to_plan_elasticsearch_actions_error';
import { FailedToExecuteElasticsearchActionsError } from './errors/failed_to_execute_elasticsearch_actions_error';

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

export interface AppendProcessorToIngestPipelineAction {
  type: 'append_processor_to_ingest_pipeline';
  pipeline: string;
  template: string;
  dataStream: string;
  processor: IngestProcessorContainer;
  referencePipeline: string;
}

interface UpsertDatastreamAction {
  type: 'upsert_datastream';
  request: {
    name: string;
  };
}

export interface UpsertWriteIndexOrRolloverAction {
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

export interface DeleteProcessorFromIngestPipelineAction {
  type: 'delete_processor_from_ingest_pipeline';
  pipeline: string;
  template: string;
  dataStream: string;
  referencePipeline: string;
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
  | AppendProcessorToIngestPipelineAction
  | UpsertDatastreamAction
  | UpsertWriteIndexOrRolloverAction
  | UpdateLifecycleAction
  | UpsertDotStreamsDocumentAction
  | DeleteDotStreamsDocumentAction
  | DeleteComponentTemplateAction
  | DeleteIndexTemplateAction
  | DeleteIngestPipelineAction
  | DeleteProcessorFromIngestPipelineAction
  | DeleteDatastreamAction
  | SyncAssetListAction;

export interface ActionsByType {
  upsert_component_template: UpsertComponentTemplateAction[];
  upsert_index_template: UpsertIndexTemplateAction[];
  update_lifecycle: UpdateLifecycleAction[];
  upsert_datastream: UpsertDatastreamAction[];
  upsert_dot_streams_document: UpsertDotStreamsDocumentAction[];
  upsert_ingest_pipeline: UpsertIngestPipelineAction[];
  upsert_write_index_or_rollover: UpsertWriteIndexOrRolloverAction[];
  sync_asset_list: SyncAssetListAction[];
  delete_datastream: DeleteDatastreamAction[];
  delete_dot_streams_document: DeleteDotStreamsDocumentAction[];
  delete_index_template: DeleteIndexTemplateAction[];
  delete_ingest_pipeline: DeleteIngestPipelineAction[];
  delete_component_template: DeleteComponentTemplateAction[];
  append_processor_to_ingest_pipeline: AppendProcessorToIngestPipelineAction[];
  delete_processor_from_ingest_pipeline: DeleteProcessorFromIngestPipelineAction[];
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
  private actionsByType: ActionsByType;

  constructor(dependencies: ExecutionPlanDependencies) {
    this.dependencies = dependencies;

    this.actionsByType = {
      upsert_component_template: [],
      upsert_index_template: [],
      update_lifecycle: [],
      upsert_datastream: [],
      upsert_dot_streams_document: [],
      upsert_ingest_pipeline: [],
      upsert_write_index_or_rollover: [],
      sync_asset_list: [],
      delete_datastream: [],
      delete_dot_streams_document: [],
      delete_index_template: [],
      delete_ingest_pipeline: [],
      delete_component_template: [],
      append_processor_to_ingest_pipeline: [],
      delete_processor_from_ingest_pipeline: [],
    };
  }

  async plan(elasticsearchActions: ElasticsearchAction[]) {
    try {
      this.actionsByType = Object.assign(this.actionsByType, groupBy(elasticsearchActions, 'type'));

      // UnwiredStreams sometimes share index templates and ingest pipelines (user managed or Streams managed)
      // In order to modify this pipelines in an atomic way and be able to clean up any Streams managed pipeline when no longer needed
      // We need to translate some actions
      await translateUnwiredStreamPipelineActions(
        this.actionsByType,
        this.dependencies.scopedClusterClient
      );
    } catch (error) {
      throw new FailedToPlanElasticsearchActionsError(
        `Failed to plan Elasticsearch action execution: ${error.message}`
      );
    }
  }

  plannedActions() {
    return this.actionsByType;
  }

  async execute() {
    try {
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
        append_processor_to_ingest_pipeline,
        delete_processor_from_ingest_pipeline,
        ...rest
      } = this.actionsByType;
      assertEmptyObject(rest);

      if (append_processor_to_ingest_pipeline.length !== 0) {
        throw new Error('append_processor_to_ingest_pipeline actions have not been merged');
      }
      if (delete_processor_from_ingest_pipeline.length !== 0) {
        throw new Error('delete_processor_from_ingest_pipeline actions have not been merged');
      }

      // This graph is parallelizing as much as possible
      // It's important we don't make changes too early, otherwise things can break halfway through
      // such as leading to data loss if routing changes too early

      await Promise.all([
        this.upsertComponentTemplates(upsert_component_template),
        this.upsertIndexTemplates(upsert_index_template),
      ]);
      await Promise.all([
        this.upsertWriteIndexOrRollover(upsert_write_index_or_rollover),
        this.updateLifecycle(update_lifecycle),
        this.upsertDatastreams(upsert_datastream),
      ]);

      await this.upsertIngestPipelines(upsert_ingest_pipeline);

      await this.deleteDatastreams(delete_datastream);

      await this.deleteIndexTemplates(delete_index_template);

      await Promise.all([
        this.deleteComponentTemplates(delete_component_template),
        this.deleteIngestPipelines(delete_ingest_pipeline),
      ]);

      await Promise.all([
        this.syncAssetList(sync_asset_list),
        this.upsertDotStreamsDocuments(upsert_dot_streams_document),
        this.deleteDotStreamsDocuments(delete_dot_streams_document),
      ]);
    } catch (error) {
      throw new FailedToExecuteElasticsearchActionsError(
        `Failed to execute Elasticsearch actions: ${error.message}`
      );
    }
  }

  private async upsertComponentTemplates(actions: UpsertComponentTemplateAction[]) {
    return Promise.all(
      actions.map((action: UpsertComponentTemplateAction) =>
        upsertComponent({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          component: action.request,
        })
      )
    );
  }

  private async upsertIndexTemplates(actions: UpsertIndexTemplateAction[]) {
    return Promise.all(
      actions.map((action: UpsertIndexTemplateAction) =>
        upsertTemplate({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          template: action.request,
        })
      )
    );
  }

  private async updateLifecycle(actions: UpdateLifecycleAction[]) {
    return Promise.all(
      actions.map((action: UpdateLifecycleAction) =>
        updateDataStreamsLifecycle({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          names: [action.request.name],
          lifecycle: action.request.lifecycle,
          isServerless: this.dependencies.isServerless,
        })
      )
    );
  }

  private async upsertDatastreams(actions: UpsertDatastreamAction[]) {
    return Promise.all(
      actions.map((action: UpsertDatastreamAction) =>
        upsertDataStream({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      )
    );
  }

  private async upsertDotStreamsDocuments(actions: UpsertDotStreamsDocumentAction[]) {
    return this.dependencies.storageClient.bulk({
      operations: actions.map((action) => ({
        index: {
          document: action.request,
          _id: action.request.name,
        },
      })),
    });
  }

  private async upsertIngestPipelines(actions: UpsertIngestPipelineAction[]) {
    const actionWithStreamsDepth = actions.map((action) => ({
      ...action,
      depth: action.stream.match(/\./g)?.length ?? 0,
    }));
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

  private async upsertWriteIndexOrRollover(actions: UpsertWriteIndexOrRolloverAction[]) {
    return Promise.all(
      actions.map((action: UpsertWriteIndexOrRolloverAction) =>
        updateOrRolloverDataStream({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      )
    );
  }

  private async syncAssetList(actions: SyncAssetListAction[]) {
    return Promise.all(
      actions.map((action: SyncAssetListAction) =>
        this.dependencies.assetClient.syncAssetList({
          entityId: action.request.name,
          entityType: 'stream',
          assetIds: action.request.assetIds,
          assetType: 'dashboard',
        })
      )
    );
  }

  private async deleteDatastreams(actions: DeleteDatastreamAction[]) {
    return Promise.all(
      actions.map((action: DeleteDatastreamAction) =>
        deleteDataStream({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      )
    );
  }

  private async deleteDotStreamsDocuments(actions: DeleteDotStreamsDocumentAction[]) {
    return this.dependencies.storageClient.bulk({
      operations: actions.map((action) => ({
        delete: {
          _id: action.request.name,
        },
      })),
    });
  }

  private async deleteIndexTemplates(actions: DeleteIndexTemplateAction[]) {
    return Promise.all(
      actions.map((action: DeleteIndexTemplateAction) =>
        deleteTemplate({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      )
    );
  }

  private async deleteIngestPipelines(actions: DeleteIngestPipelineAction[]) {
    return Promise.all(
      actions.map((action: DeleteIngestPipelineAction) =>
        deleteIngestPipeline({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          id: action.request.name,
        })
      )
    );
  }

  private async deleteComponentTemplates(actions: DeleteComponentTemplateAction[]) {
    return Promise.all(
      actions.map((action: DeleteComponentTemplateAction) =>
        deleteComponent({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      )
    );
  }
}

function assertEmptyObject(object: Record<string, never>) {
  // This is for type checking only
}
