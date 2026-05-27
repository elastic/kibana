/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type CommonSearchOptions,
  type PaginatedSearchOptions,
  type PaginatedResponse,
} from '../query_utils';
import {
  runLatestSourceEsqlQuery,
  runPaginatedLatestSourceEsqlQuery,
  runFindByIdEsqlQuery,
} from '../latest_source_query';
import {
  EVENTS_DATA_STREAM,
  type SigEvent,
  type StoredEvent,
  type eventsMappings,
} from './data_stream';

export type EventDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;

const GROUP_BY_FIELD = 'event_id';

function enrichFromEvidences(e: SigEvent): SigEvent {
  const evidences = e.evidences ?? [];
  const streamNames = e.stream_names?.length
    ? e.stream_names
    : [...new Set(evidences.map((ev) => ev.stream_name).filter((s): s is string => !!s))];
  const ruleNames = e.rule_names?.length
    ? e.rule_names
    : [...new Set(evidences.map((ev) => ev.rule_name).filter((s): s is string => !!s))];

  if (streamNames === e.stream_names && ruleNames === e.rule_names) return e;
  return { ...e, stream_names: streamNames, rule_names: ruleNames };
}

export class EventClient {
  constructor(
    private readonly clients: {
      dataStreamClient: EventDataStreamClient;
      esClient: ElasticsearchClient;
      space: string;
    }
  ) {}

  async bulkCreate(events: SigEvent[]) {
    return this.clients.dataStreamClient.create({
      space: this.clients.space,
      documents: events,
    });
  }

  async findLatest(options: CommonSearchOptions = {}): Promise<{ hits: SigEvent[] }> {
    return runLatestSourceEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      groupBy: GROUP_BY_FIELD,
    });
  }

  async findLatestPaginated(
    options: PaginatedSearchOptions = {}
  ): Promise<PaginatedResponse<SigEvent>> {
    const result = await runPaginatedLatestSourceEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      groupBy: GROUP_BY_FIELD,
    });

    return { ...result, hits: result.hits.map(enrichFromEvidences) };
  }

  async findById(discoverySlug: string): Promise<{ hits: SigEvent[] }> {
    return runFindByIdEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      index: EVENTS_DATA_STREAM,
      idField: 'discovery_slug',
      idValue: discoverySlug,
    });
  }
}
