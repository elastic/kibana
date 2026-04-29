/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SigEvent, SigEventVerdict } from '@kbn/streams-schema';
import type { IStorageClient } from '@kbn/storage-adapter';
import { EVENT_VERDICT, EVENT_TITLE, EVENT_SUMMARY, EVENT_STREAM_NAMES } from './fields';
import type { EventsStorageSettings } from './storage_settings';

interface EventsBulkIndexOperation {
  index: SigEvent;
}

interface EventsBulkDeleteOperation {
  delete: { id: string };
}

export type EventsBulkOperation = EventsBulkIndexOperation | EventsBulkDeleteOperation;

interface FindEventsFilters {
  query: string;
  streamName: string;
  verdict?: SigEventVerdict[];
}

export class EventsClient {
  constructor(public readonly storageClient: IStorageClient<EventsStorageSettings, SigEvent>) {}

  async bulk(operations: EventsBulkOperation[]): Promise<number> {
    const storageOperations = operations.map((operation) => {
      if ('index' in operation) {
        return {
          index: {
            document: operation.index,
            _id: operation.index.id,
          },
        };
      }

      return {
        delete: {
          _id: operation.delete.id,
        },
      };
    });

    await this.storageClient.bulk({
      operations: storageOperations,
      throwOnFail: true,
    });

    return 200;
  }

  async getEvents(ids: string[]): Promise<SigEvent[]> {
    if (ids.length === 0) {
      return [];
    }

    const response = await this.storageClient.search({
      size: ids.length,
      track_total_hits: false,
      query: {
        bool: {
          filter: [{ terms: { _id: ids } }],
        },
      },
    });

    return response.hits.hits.map((hit) => hit._source!);
  }

  async find(filters: FindEventsFilters): Promise<SigEvent[]> {
    const { query, streamName, verdict } = filters;
    const filterClauses: QueryDslQueryContainer[] = [
      { term: { [EVENT_STREAM_NAMES]: streamName } },
    ];

    if (verdict?.length) {
      filterClauses.push({
        terms: { [EVENT_VERDICT]: verdict },
      });
    }

    const response = await this.storageClient.search({
      size: 1000,
      track_total_hits: false,
      query: {
        bool: {
          filter: filterClauses,
          must: [
            {
              multi_match: {
                query,
                fields: [EVENT_TITLE, EVENT_SUMMARY],
                type: 'best_fields',
              },
            },
          ],
        },
      },
    });

    return response.hits.hits.map((hit) => hit._source!);
  }

  async demote(ids: string[]): Promise<{ demoted: number; ignored: number }> {
    if (ids.length === 0) {
      return { demoted: 0, ignored: 0 };
    }

    const events = await this.getEvents(ids);
    const demotableEvents = events.filter(
      (event) => event.verdict === 'promoted' || event.verdict === 'acknowledged'
    );

    if (demotableEvents.length > 0) {
      await this.bulk(
        demotableEvents.map((event) => ({
          index: {
            ...event,
            verdict: 'demoted',
          },
        }))
      );
    }

    return {
      demoted: demotableEvents.length,
      ignored: ids.length - demotableEvents.length,
    };
  }
}
