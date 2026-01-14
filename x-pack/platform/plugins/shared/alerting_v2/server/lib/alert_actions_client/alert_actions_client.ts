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
import { from, keep, limit, sort, SortOrder, where } from '@kbn/esql-composer';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { inject, injectable, optional } from 'inversify';
import { omit, zipObject } from 'lodash';
import pLimit from 'p-limit';
import type {
  BulkAlertActionItemData,
  CreateAlertActionData,
} from '../../routes/schemas/alert_action_schema';
import { QueryService } from '../services/query_service/query_service';
import type { StorageService } from '../services/storage_service/storage_service';
import { StorageServiceScopedToken } from '../services/storage_service/tokens';
import type { AlertAction as AlertActionDocument } from '../../resources/alert_actions';
import {
  alertEventSchema,
  alertTransitionSchema,
  type AlertEvent,
  type AlertTransition,
} from './types';

@injectable()
export class AlertActionsClient {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(QueryService) private readonly queryService: QueryService,
    @inject(StorageServiceScopedToken) private readonly storageService: StorageService,
    @optional() @inject(PluginStart('security')) private readonly security?: SecurityPluginStart
  ) {}

  public async executeAction(params: {
    alertSeriesId: string;
    action: CreateAlertActionData;
  }): Promise<void> {
    const [username, { alertEvent, alertTransition }] = await Promise.all([
      this.getUserName(),
      this.getAlertContext(params.alertSeriesId, params.action.episode_id),
    ]);

    await this.storageService.bulkIndexDocs({
      index: '.alerts-actions',
      docs: [
        this.buildAlertActionDocument({
          alertSeriesId: params.alertSeriesId,
          action: params.action,
          alertEvent,
          alertTransition,
          username,
        }),
      ],
    });
  }

  public async executeBulkActions(
    actions: BulkAlertActionItemData[]
  ): Promise<{ processed: number; total: number }> {
    const username = await this.getUserName();
    const limiter = pLimit(10);

    const results = await Promise.allSettled(
      actions.map((action) =>
        limiter(async () => {
          const { alertEvent, alertTransition } = await this.getAlertContext(
            action.alert_series_id,
            action.episode_id
          );

          return this.buildAlertActionDocument({
            alertSeriesId: action.alert_series_id,
            action,
            alertEvent,
            alertTransition,
            username,
          });
        })
      )
    );

    const docs = results
      .filter(
        (result): result is PromiseFulfilledResult<AlertActionDocument> =>
          result.status === 'fulfilled'
      )
      .map((result) => result.value);

    if (docs.length > 0) {
      await this.storageService.bulkIndexDocs({ index: '.alerts-actions', docs });
    }

    return { processed: docs.length, total: actions.length };
  }

  private async getUserName(): Promise<string | null> {
    return this.security?.authc.getCurrentUser(this.request)?.username ?? null;
  }

  private async getAlertContext(
    alertSeriesId: string,
    episodeId?: string
  ): Promise<{ alertEvent: AlertEvent; alertTransition: AlertTransition }> {
    const [alertEvent, alertTransition] = await Promise.all([
      this.findLastAlertEventBySeriesIdOrThrow(alertSeriesId),
      this.findLastAlertTransitionBySeriesIdOrThrow(alertSeriesId, episodeId),
    ]);

    return { alertEvent, alertTransition };
  }

  private buildAlertActionDocument(params: {
    alertSeriesId: string;
    action: CreateAlertActionData;
    alertEvent: AlertEvent;
    alertTransition: AlertTransition;
    username: string | null;
  }): AlertActionDocument {
    const { action, alertEvent, alertSeriesId, alertTransition, username } = params;

    return {
      '@timestamp': new Date().toISOString(),
      alert_series_id: alertSeriesId,
      last_series_event_timestamp: alertEvent['@timestamp'],
      actor: username,
      action_type: action.action_type,
      episode_id: alertTransition.episode_id,
      rule_id: alertEvent['rule.id'],
      ...omit(action, 'action_type', 'episode_id'),
    };
  }

  private async findLastAlertEventBySeriesIdOrThrow(alertSeriesId: string): Promise<AlertEvent> {
    const query = from('.alerts-events').pipe(
      where(`alert_series_id == ?alertSeriesId`, { alertSeriesId }),
      sort({ '@timestamp': SortOrder.Desc }),
      keep(['@timestamp', 'rule.id']),
      limit(1)
    );
    const result = await this.queryService.executeQuery({ query: query.toString() });

    if (result.values.length === 0) {
      throw Boom.notFound(`Alert event with series id [${alertSeriesId}] not found`);
    }

    return alertEventSchema.parse(
      zipObject(
        result.columns.map((col) => col.name),
        result.values[0]
      )
    );
  }

  private async findLastAlertTransitionBySeriesIdOrThrow(
    alertSeriesId: string,
    episodeId?: string
  ): Promise<AlertTransition> {
    let whereCriteria = 'alert_series_id == ?alertSeriesId';
    if (episodeId) {
      whereCriteria += ' AND episode_id == ?episodeId';
    }

    const query = from('.alerts-transitions').pipe(
      where(whereCriteria, { alertSeriesId, episodeId }),
      sort({ '@timestamp': SortOrder.Desc }),
      keep(['episode_id']),
      limit(1)
    );
    const result = await this.queryService.executeQuery({ query: query.toString() });

    if (result.values.length === 0) {
      throw Boom.notFound(
        `Alert transition with series id [${alertSeriesId}] and optional episode id [${episodeId}] not found`
      );
    }

    return alertTransitionSchema.parse(
      zipObject(
        result.columns.map((col) => col.name),
        result.values[0]
      )
    );
  }
}
