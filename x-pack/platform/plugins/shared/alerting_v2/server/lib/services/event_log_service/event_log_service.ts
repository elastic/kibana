/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import type { KibanaRequest } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
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

interface ActionPolicyExecutionCursorPayload {
  search_after: SortResults;
}

export interface FindActionPolicyExecutionEventsParams {
  request: KibanaRequest;
  startDate?: string;
  policyIds: string[];
  cursor?: string;
  pageSize?: number;
}

export interface FindActionPolicyExecutionEventsResult {
  events: IValidatedEvent[];
  cursor: string | null;
  hasMore: boolean;
}

export interface EventLogServiceContract {
  logEvent(event: IEvent, id?: string): void;
  findActionPolicyExecutionEvents(
    params: FindActionPolicyExecutionEventsParams
  ): Promise<FindActionPolicyExecutionEventsResult>;
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
    startDate,
    policyIds,
    cursor,
    pageSize,
  }: FindActionPolicyExecutionEventsParams): Promise<FindActionPolicyExecutionEventsResult> {
    if (policyIds.length === 0) {
      return { events: [], cursor: null, hasMore: false };
    }

    const client = this.clientService.getClient(request);
    const searchAfter = cursor ? decodeCursor(cursor) : undefined;

    const result = await client.findEventsBySavedObjectIdsSearchAfter(
      ACTION_POLICY_SAVED_OBJECT_TYPE,
      policyIds,
      {
        per_page: pageSize,
        sort: [
          { sort_field: '@timestamp', sort_order: 'desc' },
          { sort_field: 'event.sequence', sort_order: 'desc' },
        ],
        filter: `event.provider: ${ACTION_POLICY_EVENT_PROVIDER} AND (event.action: ${ACTION_POLICY_EVENT_ACTIONS.DISPATCHED} OR event.action: ${ACTION_POLICY_EVENT_ACTIONS.THROTTLED})`,
        start: startDate,
        ...(searchAfter ? { search_after: searchAfter } : {}),
      }
    );

    const hasMore = result.data.length === pageSize;
    const nextCursor =
      hasMore && result.search_after ? encodeCursor({ search_after: result.search_after }) : null;

    return {
      events: result.data,
      cursor: nextCursor,
      hasMore,
    };
  }
}

function encodeCursor(payload: ActionPolicyExecutionCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
}

function decodeCursor(cursor: string): SortResults | undefined {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    return Array.isArray(decoded?.search_after) ? (decoded.search_after as SortResults) : undefined;
  } catch {
    return undefined;
  }
}
