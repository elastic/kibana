/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type CommonSearchOptions } from '../query_utils';
import { runLatestEsqlQuery } from '../latest_query';
import { EVENTS_DATA_STREAM, type StoredEvent, type eventsMappings } from './data_stream';

export interface SigEvent {
  '@timestamp': string;
  event_id: string;
  verdict: string;
  verdict_id: string;
  discovery_id: string;
  discovery_slug: string;
  title: string;
}

const EVENT_FIELDS: ReadonlyArray<keyof SigEvent & string> = [
  '@timestamp',
  'event_id',
  'verdict',
  'verdict_id',
  'discovery_id',
  'discovery_slug',
  'title',
];

export type EventDataStreamClient = IDataStreamClient<typeof eventsMappings, StoredEvent>;

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

  async find(options: CommonSearchOptions = {}): Promise<{ hits: SigEvent[] }> {
    return runLatestEsqlQuery<SigEvent>({
      esClient: this.clients.esClient,
      space: this.clients.space,
      options,
      index: EVENTS_DATA_STREAM,
      fields: EVENT_FIELDS,
      stats: (query) => query.pipe`STATS @timestamp = MAX(@timestamp),
              verdict = LATEST(verdict),
              verdict_id = LATEST(verdict_id),
              discovery_id = LATEST(discovery_id),
              discovery_slug = LATEST(discovery_slug),
              title = LATEST(\`title.keyword\`)
          BY event_id`,
    });
  }
}
