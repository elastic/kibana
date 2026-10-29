/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { esql } from '@elastic/esql';
import type {
  ImportResponse,
  ImportStatsItem,
  ImportStatsResponse,
} from '@kbn/alerting-v2-schemas';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { KibanaRequest } from '@kbn/core-http-server';
import { Request } from '@kbn/core-di-server';
import { inject, injectable } from 'inversify';
import { ImportConfigClient } from '../import_config_client';
import type { ImportSetupActionsClient, ImportSetupWorkflowsApi } from '../import_setup';
import { ActionsClientToken } from '../import_setup';
import { WorkflowsManagementApiToken } from '../dispatcher/steps/dispatch_step_tokens';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceScopedToken } from '../services/query_service/tokens';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import { deriveImportStatus } from './derive_import_status';

/** Imports the stats are computed for. A page lists them all at once. */
const MAX_IMPORTS = 1000;

interface AlertStatsRow {
  import_id: string;
  alert_series_count: number;
  last_alert_at: string | null;
}

const isNotFound = (e: unknown): boolean => Boom.isBoom(e) && e.output.statusCode === 404;

/**
 * Everything the imports list shows beyond the config records, for all imports in one call:
 * alert counts from the rule events, and whether the connector and workflow still exist, whether
 * the workflow is enabled, and how its last run went.
 */
@injectable()
export class ImportStatsClient {
  constructor(
    @inject(ImportConfigClient) private readonly importConfigClient: ImportConfigClient,
    @inject(QueryServiceScopedToken) private readonly queryService: QueryServiceContract,
    @inject(ActionsClientToken) private readonly actionsClient: ImportSetupActionsClient,
    @inject(WorkflowsManagementApiToken)
    private readonly workflowsManagement: ImportSetupWorkflowsApi,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RequestSpaceIdToken) private readonly spaceId: string
  ) {}

  public async getImportStats(): Promise<ImportStatsResponse> {
    const { items } = await this.importConfigClient.findImportConfigs({
      page: 1,
      perPage: MAX_IMPORTS,
    });
    const now = new Date();

    const [alertStats, ...perImport] = await Promise.all([
      this.loadAlertStats(items.map(({ id }) => id)),
      ...items.map((config) => this.loadResourceStats(config)),
    ]);

    return {
      items: items.map((config, index): ImportStatsItem => {
        const alerts = alertStats.get(config.id);
        const resources = perImport[index];
        const lastAlertAt = alerts?.last_alert_at ?? null;

        return {
          id: config.id,
          status: deriveImportStatus({
            // For a managed import the connector decides whether events arrive at all.
            enabled: config.enabled && resources.receivingEvents,
            connectorExists: resources.connectorExists,
            workflowExists: resources.workflowExists,
            workflowEnabled: resources.workflowEnabled,
            lastExecutionStatus: resources.lastExecution?.status,
            lastAlertAt,
            now,
          }),
          alert_series_count: alerts?.alert_series_count ?? 0,
          last_alert_at: lastAlertAt,
          connector_exists: resources.connectorExists,
          receiving_events: resources.receivingEvents,
          workflow_exists: resources.workflowExists,
          workflow_enabled: resources.workflowEnabled,
          last_execution: resources.lastExecution,
        };
      }),
    };
  }

  /** Series count and last alert time per import, from the alerts written with its id as rule.id. */
  private async loadAlertStats(importIds: string[]): Promise<Map<string, AlertStatsRow>> {
    if (importIds.length === 0) {
      return new Map();
    }

    const idValues = importIds.map((id) => esql.str(id));
    const { query } = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM}
      | WHERE type == "alert"
          AND space_id == ${this.spaceId}
          AND rule.id IN (${idValues})
      | STATS
          alert_series_count = COUNT_DISTINCT(group_hash),
          last_alert_at = MAX(@timestamp)
        BY import_id = rule.id
      | LIMIT ${MAX_IMPORTS}
    `.toRequest();

    const rows = await this.queryService.executeQueryRows<AlertStatsRow>({ query });
    return new Map(rows.map((row) => [row.import_id, row]));
  }

  private async loadResourceStats(config: ImportResponse): Promise<{
    connectorExists: boolean;
    receivingEvents: boolean;
    workflowExists: boolean;
    workflowEnabled: boolean;
    lastExecution: ImportStatsItem['last_execution'];
  }> {
    const [connector, workflow, executions] = await Promise.all([
      this.actionsClient.get({ id: config.connector_id }).then(
        (found) => found,
        (e: unknown) => {
          if (isNotFound(e)) return null;
          throw e;
        }
      ),
      this.workflowsManagement.getWorkflow(config.workflow_id, this.spaceId, this.request),
      this.workflowsManagement.getWorkflowExecutions(
        {
          workflowId: config.workflow_id,
          size: 1,
          sortField: 'createdAt',
          sortOrder: 'desc',
          request: this.request,
        },
        this.spaceId
      ),
    ]);

    const [last] = executions.results;

    return {
      connectorExists: connector !== null,
      // Only the connector of a managed import can have receiving events turned off.
      receivingEvents: config.kind !== 'managed' || connector?.isInboundEventsEnabled === true,
      workflowExists: workflow !== null,
      workflowEnabled: workflow?.enabled ?? false,
      lastExecution: last
        ? {
            status: last.status,
            started_at: last.startedAt ?? null,
            finished_at: last.finishedAt ?? null,
          }
        : null,
    };
  }
}
