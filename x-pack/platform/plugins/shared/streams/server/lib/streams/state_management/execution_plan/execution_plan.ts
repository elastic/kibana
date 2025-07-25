/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import { groupBy, orderBy } from 'lodash';
import { SecurityHasPrivilegesRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  deleteComponent,
  upsertComponent,
} from '../../component_templates/manage_component_templates';
import {
  deleteDataStream,
  updateDataStreamsLifecycle,
  updateOrRolloverDataStream,
  upsertDataStream,
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
import { translateUnwiredStreamPipelineActions } from './translate_unwired_stream_pipeline_actions';
import type {
  ActionsByType,
  DeleteComponentTemplateAction,
  DeleteDatastreamAction,
  DeleteDotStreamsDocumentAction,
  DeleteIndexTemplateAction,
  DeleteIngestPipelineAction,
  ElasticsearchAction,
  UpdateLifecycleAction,
  UpsertComponentTemplateAction,
  UpsertDatastreamAction,
  UpsertDotStreamsDocumentAction,
  UpsertIndexTemplateAction,
  UpsertIngestPipelineAction,
  UpsertWriteIndexOrRolloverAction,
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
      append_processor_to_ingest_pipeline: [],
      delete_processor_from_ingest_pipeline: [],
      upsert_datastream: [],
      update_lifecycle: [],
      upsert_write_index_or_rollover: [],
      delete_datastream: [],
      upsert_dot_streams_document: [],
      delete_dot_streams_document: [],
    };
  }

  async plan(elasticsearchActions: ElasticsearchAction[]) {
    try {
      this.actionsByType = Object.assign(this.actionsByType, groupBy(elasticsearchActions, 'type'));

      await translateUnwiredStreamPipelineActions(
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
        upsert_write_index_or_rollover,
        delete_datastream,
        upsert_dot_streams_document,
        delete_dot_streams_document,
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
      await Promise.all([
        this.upsertWriteIndexOrRollover(upsert_write_index_or_rollover),
        this.updateLifecycle(update_lifecycle),
      ]);

      await this.upsertIngestPipelines(upsert_ingest_pipeline);

      await this.deleteDatastreams(delete_datastream);

      await this.deleteIndexTemplates(delete_index_template);

      await Promise.all([
        this.deleteComponentTemplates(delete_component_template),
        this.deleteIngestPipelines(delete_ingest_pipeline),
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

  private async upsertWriteIndexOrRollover(actions: UpsertWriteIndexOrRolloverAction[]) {
    return Promise.all(
      actions.map((action) =>
        updateOrRolloverDataStream({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          name: action.request.name,
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
      depth: action.stream.match(/\./g)?.length ?? 0,
    }));
    return Promise.all(
      orderBy(actionWithStreamsDepth, 'depth', 'desc').map((action) =>
        upsertIngestPipeline({
          esClient: this.dependencies.scopedClusterClient.asCurrentUser,
          logger: this.dependencies.logger,
          pipeline: action.request,
        })
      )
    );
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
    });
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
