/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamClient } from '@kbn/data-streams';
import { EventClient } from './event_client';
import { eventsDataStream, type StoredEvent, type eventsMappings } from './data_stream';

export class EventService {
  async getClient({
    esClient,
    space,
  }: {
    esClient: ElasticsearchClient;
    space: string;
  }): Promise<EventClient> {
    const dataStreamClient = DataStreamClient.create<typeof eventsMappings, StoredEvent>({
      dataStream: eventsDataStream,
      elasticsearchClient: esClient,
    });

    return new EventClient({
      dataStreamClient,
      esClient,
      space,
    });
  }
}
