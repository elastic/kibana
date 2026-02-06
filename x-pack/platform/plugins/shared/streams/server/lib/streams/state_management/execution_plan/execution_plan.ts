/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import { getSegments } from '@kbn/streams-schema';
import type { SecurityHasPrivilegesRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  deleteComponent,
  upsertComponent,
} from '../../component_templates/manage_component_templates';
import {
  deleteDataStream,
  updateDataStreamsLifecycle,
  updateDataStreamsMappings,
  rolloverDataStream,
  upsertDataStream,
  updateDefaultIngestPipeline,
  putDataStreamsSettings,
  updateDataStreamsFailureStore,
} from '../../data_streams/manage_data_streams';
import { deleteTemplate, upsertTemplate } from '../../index_templates/manage_index_templates';
import {
  deleteIngestPipeline,
  upsertIngestPipeline,
} from '../../ingest_pipelines/manage_ingest_pipelines';
import { FailedToExecuteElasticsearchActionsError } from '../errors/failed_to_execute_elasticsearch_actions_error';
import { FailedToPlanElasticsearchActionsError } from '../errors/failed_to_plan_elasticsearch_actions_error';
import { InsufficientPermissionsError } from '../../errors/insufficient_permissions_error';
import type { StateDependencies } from '../types';
import { getRequiredPermissionsForActions } from './required_permissions';
import { translateClassicStreamPipelineActions } from './translate_classic_stream_pipeline_actions';
import type {
  ActionsByType,
  DeleteComponentTemplateAction,
  DeleteDatastreamAction,
  DeleteDotStreamsDocumentAction,
  DeleteIndexTemplateAction,
  DeleteIngestPipelineAction,
  DeleteQueriesAction,
  ElasticsearchAction,
  UpdateDataStreamMappingsAction,
  UpdateLifecycleAction,
  UpsertComponentTemplateAction,
  UpsertDatastreamAction,
  UpsertDotStreamsDocumentAction,
  UpsertIndexTemplateAction,
  UpsertIngestPipelineAction,
  RolloverAction,
  UpdateDefaultIngestPipelineAction,
  UnlinkAssetsAction,
  UnlinkSystemsAction,
  UpdateIngestSettingsAction,
  UpdateFailureStoreAction,
  UnlinkFeaturesAction,
} from './types';

/**
 * This class takes a list of ElasticsearchActions and groups them by type.
 * It then tries to plan these actions to make the least amount of changes to Elasticsearch resources
 * The execution of the plan aims to be as parallel as possible while still respecting the order of operations
 * to avoid any data loss
 */
export class ExecutionPlan {
  private dependencies: StateDependencies;
  private actionsByType: ActionsByType;

  constructor(dependencies: StateDependencies) {
    this.dependencies = dependencies;

    this.actionsByType = {
      upsert_component_template: [],
      delete_component_template: [],
      upsert_index_template: [],
      delete_index_template: [],
      upsert_ingest_pipeline: [],
      delete_ingest_pipeline: [],
      update_failure_store: [],
      append_processor_to_ingest_pipeline: [],
      delete_processor_from_ingest_pipeline: [],
      upsert_datastream: [],
      update_lifecycle: [],
      update_default_ingest_pipeline: [],
      rollover: [],
      delete_datastream: [],
      upsert_dot_streams_document: [],
      delete_dot_streams_document: [],
      update_data_stream_mappings: [],
      delete_queries: [],
      unlink_assets: [],
      unlink_systems: [],
      unlink_features: [],
      update_ingest_settings: [],
    };
  }

  async plan(elasticsearchActions: ElasticsearchAction[]) {
    try {
      this.actionsByType = Object.assign(this.actionsByType, groupBy(elasticsearchActions, 'type'));

      await translateClassicStreamPipelineActions(
        this.actionsByType,
        this.dependencies.scopedClusterClient
      );
    } catch (error) {
      throw new FailedToPlanElasticsearchActionsError(
        `Failed to plan Elasticsearch action execution: ${error.message}`
      );
    }

    await this.validatePermissions();
  }

  plannedActions() {
    return this.actionsByType;
  }

  async validatePermissions() {
    const { actionsByType } = this;

    const requiredPermissions = getRequiredPermissionsForActions({
      actionsByType,
      isServerless: this.dependencies.isServerless,
    });

    // Check if we have any permissions to validate
    if (
      requiredPermissions.cluster.length === 0 &&
      Object.keys(requiredPermissions.index).length === 0
    ) {
      return true;
    }

    // Use security API to check if user has all required permissions
    const securityClient = this.dependencies.scopedClusterClient.asCurrentUser.security;

    const hasPrivilegesRequest: SecurityHasPrivilegesRequest = {
      cluster: requiredPermissions.cluster.length > 0 ? requiredPermissions.cluster : undefined,
    };

    // Add index privileges if there are any
    if (Object.keys(requiredPermissions.index).length > 0) {
      hasPrivilegesRequest.index = Object.entries(requiredPermissions.index).map(
        ([index, privileges]) => ({
          names: [index],
          privileges,
        })
      );
    }

    const hasPrivilegesResponse = await securityClient.hasPrivileges(hasPrivilegesRequest);

    if (!hasPrivilegesResponse.has_all_requested) {
      throw new InsufficientPermissionsError(
        'User does not have sufficient permissions to execute these actions',
        hasPrivilegesResponse
      );
    }
  }

  async execute() {
    try {
      const {
        upsert_component_template,
        delete_component_template,
        upsert_index_template,
        delete_index_template,
        upsert_ingest_pipeline,
        delete_ingest_pipeline,
        append_processor_to_ingest_pipeline,
        delete_processor_from_ingest_pipeline,
        upsert_datastream,
        update_lifecycle,
        rollover,
        update_default_ingest_pipeline,
        delete_datastream,
        upsert_dot_streams_document,
        delete_dot_streams_document,
        update_data_stream_mappings,
        update_failure_store,
        delete_queries,
        unlink_assets,
        unlink_systems,
        unlink_features,
        update_ingest_settings,
        ...rest
      } = this.actionsByType;
      assertEmptyObject(rest);

      if (append_processor_to_ingest_pipeline.length !== 0) {
        throw new Error('append_processor_to_ingest_pipeline actions have not been translated');
      }
      if (delete_processor_from_ingest_pipeline.length !== 0) {
        throw new Error('delete_processor_from_ingest_pipeline actions have not been translated');
      }

      // This graph is parallelizing as much as possible
      // It's important we don't make changes too early, otherwise things can break halfway through
      // such as leading to data loss if routing changes too early

      await Promise.all([
        this.upsertComponentTemplates(upsert_component_template),
        this.upsertIndexTemplates(upsert_index_template),
      ]);
      await this.upsertDatastreams(upsert_datastream);
      await this.updateIngestSettings(update_ingest_settings);
      await Promise.all([
        this.rollover(rollover),
        this.updateLifecycle(update_lifecycle),
        this.updateDataStreamMappingsAndRollover(update_data_stream_mappings),
        this.updateDefaultIngestPipeline(update_default_ingest_pipeline),
        this.updateFailureStore(update_failure_store),
      ]);

      await this.upsertIngestPipelines(upsert_ingest_pipeline);

      await this.deleteDatastreams(delete_datastream);

      await this.deleteIndexTemplates(delete_index_template);

      await Promise.all([
        this.deleteComponentTemplates(delete_component_template),
        this.deleteIngestPipelines(delete_ingest_pipeline),
        this.deleteQueries(delete_queries),
        this.unlinkAssets(unlink_assets),
        this.unlinkSystems(unlink_systems),
        this.unlinkFeatures(unlink_features),
      ]);

      await this.upsertAndDeleteDotStreamsDocuments([
        ...upsert_dot_streams_document,
        ...delete_dot_streams_document,
      ]);
    } catch (error) {
      throw new FailedToExecuteElasticsearchActionsError(
        `Failed to execute Elasticsearch actions: ${error.message}`
      );
    }
  }

  private async deleteQueries(actions: DeleteQueriesAction[]) {
    if (actions.length === 0) {
      return;
    }

    return Promise.all(
      actions.map((action) => this.dependencies.queryClient.deleteAll(action.request.name))
    );
  }

  private async unlinkAssets(actions: UnlinkAssetsAction[]) {
    if (actions.length === 0) {
      return;
    }

    return Promise.all(
      actions.flatMap((action) => [
        this.dependencies.attachmentClient.syncAttachmentList(action.request.name, [], 'dashboard'),
        this.dependencies.attachmentClient.syncAttachmentList(action.request.name, [], 'rule'),
      ])
    );
  }

  private async unlinkSystems(actions: UnlinkSystemsAction[]) {
    if (actions.length === 0) {
      return;
    }

    return Promise.all(
      actions.map((action) =>
        this.dependencies.systemClient.syncSystemList(action.request.name, [])
      )
    );
  }

  private async unlinkFeatures(actions: UnlinkFeaturesAction[]) {
    if (actions.length === 0) {
      return;
    }

    return Promise.all(
      actions.map((action) => this.dependencies.featureClient.deleteFeatures(action.request.name))
    );
  }

  private async upsertComponentTemplates(actions: UpsertComponentTemplateAction[]) {
    return Promise.all(
      actions.map((action) =>
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
      actions.map((action) =>
        upsertTemplate({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          template: action.request,
        })
      )
    );
  }

  private async rollover(actions: RolloverAction[]) {
    return Promise.all(
      actions.map((action) =>
        rolloverDataStream({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      )
    );
  }

  private async updateDefaultIngestPipeline(actions: UpdateDefaultIngestPipelineAction[]) {
    return Promise.all(
      actions.map((action) =>
        updateDefaultIngestPipeline({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          name: action.request.name,
          pipeline: action.request.pipeline,
        })
      )
    );
  }

  private async updateLifecycle(actions: UpdateLifecycleAction[]) {
    return Promise.all(
      actions.map((action) =>
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

  private async updateDataStreamMappingsAndRollover(actions: UpdateDataStreamMappingsAction[]) {
    return Promise.all(
      actions.map((action) =>
        updateDataStreamsMappings({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
          mappings: action.request.mappings,
        })
      )
    );
  }

  private async upsertDatastreams(actions: UpsertDatastreamAction[]) {
    return Promise.all(
      actions.map((action) =>
        upsertDataStream({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      )
    );
  }

  private async upsertIngestPipelines(actions: UpsertIngestPipelineAction[]) {
    const actionWithStreamsDepth = actions.map((action) => ({
      ...action,
      depth: getSegments(action.stream).length - 1,
    }));

    const actionsByDepth = groupBy(actionWithStreamsDepth, 'depth');
    const depths = Object.keys(actionsByDepth)
      .map(Number)
      .sort((a, b) => b - a); // Sort descending: deepest (children) first

    // Process each depth level sequentially, with pipelines at the same depth in parallel
    for (const depth of depths) {
      await Promise.all(
        actionsByDepth[depth].map((action) =>
          upsertIngestPipeline({
            esClient: this.dependencies.scopedClusterClient.asCurrentUser,
            logger: this.dependencies.logger,
            pipeline: action.request,
          })
        )
      );
    }
  }

  private async deleteDatastreams(actions: DeleteDatastreamAction[]) {
    return Promise.all(
      actions.map((action) =>
        deleteDataStream({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      )
    );
  }

  private async deleteIndexTemplates(actions: DeleteIndexTemplateAction[]) {
    return Promise.all(
      actions.map((action) =>
        deleteTemplate({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      )
    );
  }

  private async updateFailureStore(actions: UpdateFailureStoreAction[]) {
    return Promise.all(
      actions.map((action) =>
        updateDataStreamsFailureStore({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          failureStore: action.request.failure_store,
          stream: action.request.definition,
          isServerless: this.dependencies.isServerless,
        })
      )
    );
  }

  private async deleteIngestPipelines(actions: DeleteIngestPipelineAction[]) {
    return Promise.all(
      actions.map((action) =>
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
      actions.map((action) =>
        deleteComponent({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
        })
      )
    );
  }

  private async upsertAndDeleteDotStreamsDocuments(
    actions: Array<UpsertDotStreamsDocumentAction | DeleteDotStreamsDocumentAction>
  ) {
    return this.dependencies.storageClient.bulk({
      operations: actions.map(dotDocumentActionToBulkOperation),
      refresh: true,
      throwOnFail: true,
    });
  }

  private async updateIngestSettings(actions: UpdateIngestSettingsAction[]) {
    return Promise.all(
      actions.map((action) =>
        putDataStreamsSettings({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          names: [action.request.name],
          settings: action.request.settings,
        })
      )
    );
  }
}

function dotDocumentActionToBulkOperation(
  action: UpsertDotStreamsDocumentAction | DeleteDotStreamsDocumentAction
) {
  if (action.type === 'upsert_dot_streams_document') {
    return {
      index: {
        document: action.request,
        _id: action.request.name,
      },
    };
  }

  return {
    delete: {
      _id: action.request.name,
    },
  };
}

function assertEmptyObject(object: Record<string, never>) {
  // This is for type checking only
}
