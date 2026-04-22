/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Temporary endpoint used to reset the alerting_v2 resources (data streams,
 * their backing index templates, all plugin-owned saved objects, and the
 * per-rule task_manager tasks) when breaking changes require a clean slate.
 * Added as part of https://github.com/elastic/rna-program/issues/204.
 *
 * Meant to be removed before GA: delete this file and its `bind(Route)` entry
 * in `server/setup/bind_routes.ts`. Nothing else references it. Removal is
 * tracked by https://github.com/elastic/rna-program/issues/426.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import {
  ALERTING_CASES_SAVED_OBJECT_INDEX,
  TASK_MANAGER_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import { isResponseError } from '@kbn/es-errors';
import { inject, injectable } from 'inversify';

import { ALERTING_RULE_EXECUTOR_TASK_TYPE } from '../lib/rule_executor/task_definition';
import { ALERTING_V2_API_PRIVILEGES } from '../lib/security/privileges';
import { EsServiceScopedToken } from '../lib/services/es_service/tokens';
import { DatastreamInitializer } from '../lib/services/resource_service/datastream_initializer';
import { getDataStreamResourceDefinitions } from '../resources/datastreams/register';
import type { ResourceDefinition } from '../resources/datastreams/types';
import {
  API_KEY_PENDING_INVALIDATION_TYPE,
  NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
  RULE_SAVED_OBJECT_TYPE,
} from '../saved_objects';
import { AlertingRouteContext } from './alerting_route_context';
import { BaseAlertingRoute } from './base_alerting_route';

const RESET_RESOURCES_API_PATH = '/internal/alerting/v2/_reset_resources';

// Keep in sync with `registerSavedObjects` in `server/saved_objects/index.ts`.
const ALERTING_V2_SAVED_OBJECT_TYPES = [
  RULE_SAVED_OBJECT_TYPE,
  NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
  API_KEY_PENDING_INVALIDATION_TYPE,
];

@injectable()
export class ResetResourcesRoute extends BaseAlertingRoute {
  static method = 'post' as const;
  static path = RESET_RESOURCES_API_PATH;
  static security: RouteSecurity = {
    authz: {
      requiredPrivileges: [
        ALERTING_V2_API_PRIVILEGES.rules.write,
        ALERTING_V2_API_PRIVILEGES.alerts.write,
        ALERTING_V2_API_PRIVILEGES.notificationPolicies.write,
      ],
    },
  };
  static routeOptions = {
    access: 'internal',
    summary: 'Reset alerting v2 resources (temporary, pre-GA only)',
  } as const;
  static validate = false as const;

  protected readonly routeName = 'reset alerting v2 resources';

  constructor(
    @inject(AlertingRouteContext) ctx: AlertingRouteContext,
    @inject(EsServiceScopedToken) private readonly esClient: ElasticsearchClient
  ) {
    super(ctx);
  }

  protected async execute() {
    const definitions = getDataStreamResourceDefinitions();

    const dataStreamNames = definitions.map((definition) => definition.dataStreamName).join(', ');
    const savedObjectTypes = ALERTING_V2_SAVED_OBJECT_TYPES.join(', ');
    this.ctx.logger.debug(
      `Resetting alerting v2 resources [data streams: ${dataStreamNames}, saved objects: ${savedObjectTypes}, task type: ${ALERTING_RULE_EXECUTOR_TASK_TYPE}]`
    );

    await this.deleteAllRuleTasks();
    await this.deleteAllSavedObjects();

    for (const definition of definitions) {
      await this.deleteDataStreamIfExists(definition.dataStreamName);
      await this.deleteIndexTemplateIfExists(definition.dataStreamName);
      await this.recreate(definition);
    }

    return this.ctx.response.noContent();
  }

  /**
   * Delete every saved object registered by this plugin across all spaces.
   *
   * The SavedObjectsClient does not expose a "delete all of type" operation,
   * so we fall back to a `delete_by_query` against the saved objects index
   * (`.kibana_alerting_cases`) filtered by the three plugin-owned types.
   */
  private async deleteAllSavedObjects(): Promise<void> {
    await this.esClient.deleteByQuery({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      query: {
        terms: { type: ALERTING_V2_SAVED_OBJECT_TYPES },
      },
      conflicts: 'proceed',
      refresh: true,
      wait_for_completion: true,
    });
  }

  /**
   * Delete every task_manager task associated with an alerting_v2 rule.
   *
   * Task manager tasks are stored as `type: 'task'` saved objects in
   * `.kibana_task_manager` with the task type under `task.taskType`. We
   * narrow to `ALERTING_RULE_EXECUTOR_TASK_TYPE` so recurring infra tasks
   * owned by this plugin (API key invalidation, dispatcher, usage) are left
   * alone — only the per-rule tasks are removed.
   */
  private async deleteAllRuleTasks(): Promise<void> {
    await this.esClient.deleteByQuery({
      index: TASK_MANAGER_SAVED_OBJECT_INDEX,
      query: {
        bool: {
          must: [
            { term: { type: 'task' } },
            { term: { 'task.taskType': ALERTING_RULE_EXECUTOR_TASK_TYPE } },
          ],
        },
      },
      conflicts: 'proceed',
      refresh: true,
      wait_for_completion: true,
    });
  }

  private async deleteDataStreamIfExists(name: string): Promise<void> {
    try {
      await this.esClient.indices.deleteDataStream({ name });
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return;
      }

      throw error;
    }
  }

  private async deleteIndexTemplateIfExists(name: string): Promise<void> {
    try {
      await this.esClient.indices.deleteIndexTemplate({ name });
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return;
      }

      throw error;
    }
  }

  private async recreate(definition: ResourceDefinition): Promise<void> {
    // Manual construction instead of DI: DatastreamInitializer is wired to
    // the internal ES client via @inject, and we want the request-scoped one.
    const initializer = new DatastreamInitializer(this.ctx.logger, this.esClient, definition);
    await initializer.initialize();
  }
}
