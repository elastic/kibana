/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import type { KibanaRequest } from '@kbn/core/server';
import { fromKueryExpression } from '@kbn/es-query';
import type {
  IEvent,
  IEventLogClientService,
  IEventLogger,
  IValidatedEvent,
} from '@kbn/event-log-plugin/server';
import { ACTION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  ACTION_POLICY_EVENT_PROVIDER,
} from '../../dispatcher/steps/constants';
import type { AlertingServerStartDependencies } from '../../../types';
import { EventLoggerToken } from './tokens';

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE = 1;

const EXECUTION_HISTORY_AUTH_FILTER = fromKueryExpression(
  `event.provider: ${ACTION_POLICY_EVENT_PROVIDER} AND (event.action: ${ACTION_POLICY_EVENT_ACTIONS.DISPATCHED} OR event.action: ${ACTION_POLICY_EVENT_ACTIONS.THROTTLED})`
);

export interface FindActionPolicyExecutionEventsParams {
  request: KibanaRequest;
  spaceId: string;
  startDate: string;
  page?: number;
  perPage?: number;
}

export interface FindActionPolicyExecutionEventsResult {
  events: IValidatedEvent[];
  page: number;
  perPage: number;
  total: number;
}

export interface CountActionPolicyExecutionEventsSinceParams {
  request: KibanaRequest;
  spaceId: string;
  since: string;
}

export interface CountActionPolicyExecutionEventsSinceResult {
  count: number;
}

export interface EventLogServiceContract {
  logEvent(event: IEvent, id?: string): void;
  findActionPolicyExecutionEvents(
    params: FindActionPolicyExecutionEventsParams
  ): Promise<FindActionPolicyExecutionEventsResult>;
  countActionPolicyExecutionEventsSince(
    params: CountActionPolicyExecutionEventsSinceParams
  ): Promise<CountActionPolicyExecutionEventsSinceResult>;
}

@injectable()
export class EventLogService implements EventLogServiceContract {
  constructor(
    @inject(EventLoggerToken) private readonly eventLogger: IEventLogger,
    @inject(PluginStart<AlertingServerStartDependencies['eventLog']>('eventLog'))
    private readonly clientService: IEventLogClientService
  ) {}

  public logEvent(event: IEvent, id?: string): void {
    this.eventLogger.logEvent(event, id);
  }

  public async findActionPolicyExecutionEvents({
    request,
    spaceId,
    startDate,
    page = DEFAULT_PAGE,
    perPage = DEFAULT_PAGE_SIZE,
  }: FindActionPolicyExecutionEventsParams): Promise<FindActionPolicyExecutionEventsResult> {
    const client = this.clientService.getClient(request);

    const result = await client.findEventsWithAuthFilter(
      ACTION_POLICY_SAVED_OBJECT_TYPE,
      [],
      EXECUTION_HISTORY_AUTH_FILTER,
      spaceId,
      {
        page,
        per_page: perPage,
        sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
        start: startDate,
      }
    );

    return {
      events: result.data,
      page: result.page,
      perPage: result.per_page,
      total: result.total,
    };
  }

  public async countActionPolicyExecutionEventsSince({
    request,
    spaceId,
    since,
  }: CountActionPolicyExecutionEventsSinceParams): Promise<CountActionPolicyExecutionEventsSinceResult> {
    const client = this.clientService.getClient(request);

    const result = await client.findEventsWithAuthFilter(
      ACTION_POLICY_SAVED_OBJECT_TYPE,
      [],
      EXECUTION_HISTORY_AUTH_FILTER,
      spaceId,
      {
        page: 1,
        per_page: 0,
        sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
        start: since,
      }
    );

    return { count: result.total };
  }
}
