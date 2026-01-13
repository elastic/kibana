/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { inject, injectable, optional } from 'inversify';
import { zipObject } from 'lodash';
import type { AlertAction } from '../../routes/schemas/alert_action_schema';
import { LoggerService } from '../services/logger_service/logger_service';
import { QueryService } from '../services/query_service/query_service';
import type { StorageService } from '../services/storage_service/storage_service';
import { StorageServiceScopedToken } from '../services/storage_service/tokens';

@injectable()
export class AlertActionsClient {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(LoggerService) private readonly logger: LoggerService,
    @inject(QueryService) private readonly queryService: QueryService,
    @inject(StorageServiceScopedToken) private readonly storageService: StorageService,
    @optional() @inject(PluginStart('security')) private readonly security?: SecurityPluginStart
  ) {}

  private async getUserName(): Promise<string | null> {
    return this.security?.authc.getCurrentUser(this.request)?.username ?? null;
  }

  public async executeAction(params: {
    alertSeriesId: string;
    action: AlertAction;
  }): Promise<void> {
    const [username, alertEvent, alertTransition] = await Promise.all([
      this.getUserName(),
      this.findLastAlertEventBySeriesIdOrThrow(params.alertSeriesId),
      this.findLastAlertTransitionBySeriesIdOrThrow(params.alertSeriesId),
    ]);

    await this.storageService.bulkIndexDocs({
      index: '.alerts-actions',
      docs: [
        {
          '@timestamp': new Date().toISOString(),
          alert_series_id: params.alertSeriesId,
          last_series_event_timestamp: alertEvent['@timestamp'],
          actor: username,
          action_type: params.action.action_type,
          episode_id: alertTransition.episode_id,
          rule_id: alertEvent['rule.id'],
        },
      ],
    });
  }

  // TODO: Add DTOs for the returned records
  private async findLastAlertEventBySeriesIdOrThrow(
    alertSeriesId: string
  ): Promise<Record<string, unknown>> {
    const result = await this.queryService.executeQuery({
      query: `FROM .alerts-events | WHERE alert_series_id == "${alertSeriesId}" | SORT @timestamp DESC | LIMIT 1`,
    });
    if (result.values.length === 0) {
      throw Boom.notFound(`Alert event with series id [${alertSeriesId}] not found`);
    }

    this.logger.debug({
      message: () =>
        `Found alert event for series id [${alertSeriesId}]: ${JSON.stringify(result)}`,
    });

    return zipObject(
      result.columns.map((col) => col.name),
      result.values[0]
    );
  }

  // TODO: Add DTOs for the returned records
  private async findLastAlertTransitionBySeriesIdOrThrow(
    alertSeriesId: string
  ): Promise<Record<string, unknown>> {
    const result = await this.queryService.executeQuery({
      query: `FROM .alerts-transitions | WHERE alert_series_id == "${alertSeriesId}" | SORT @timestamp DESC | LIMIT 1`,
    });
    if (result.values.length === 0) {
      throw Boom.notFound(`Alert transition with series id [${alertSeriesId}] not found`);
    }

    this.logger.debug({
      message: () =>
        `Found alert transition for series id [${alertSeriesId}]: ${JSON.stringify(result)}`,
    });

    return zipObject(
      result.columns.map((col) => col.name),
      result.values[0]
    );
  }
}
