/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PubSubDurableEvent } from '@kbn/core-pubsub-server';
import { EVENTS_INDEX } from './constants';

export interface StoredEvent {
  readonly seqNo: number;
  readonly id: string;
  readonly topic: string;
  readonly acceptedAt: string;
  readonly data: unknown;
}

/** Reads and writes the events index. Sequence numbers are the index's `_seq_no`. */
export interface EventsStore {
  append(event: PubSubDurableEvent): Promise<void>;
  /** The highest sequence number below which every operation is complete, or -1 for an empty index. */
  getGlobalCheckpoint(): Promise<number>;
  /** Events on `topic` with `afterSeqNo < _seq_no <= throughSeqNo`, ascending. */
  readPage(params: {
    topic: string;
    afterSeqNo: number;
    throughSeqNo: number;
    size: number;
  }): Promise<StoredEvent[]>;
}

export const getEventDocId = (topic: string, eventId: string): string =>
  createHash('sha256').update(`${topic}\n${eventId}`).digest('hex');

interface EventDocument {
  topic: string;
  event_id: string;
  accepted_at: string;
  data: unknown;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStatus = (error: unknown, status: number): boolean =>
  (error as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode === status ||
  (error as { meta?: { statusCode?: number } })?.meta?.statusCode === status;

export const createEventsIndexIfMissing = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  try {
    await esClient.indices.create({
      index: EVENTS_INDEX,
      settings: {
        hidden: true,
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      mappings: {
        dynamic: 'strict',
        properties: {
          topic: { type: 'keyword' },
          event_id: { type: 'keyword' },
          accepted_at: { type: 'date' },
          data: { type: 'object', enabled: false },
        },
      },
    });
    logger.info(`Created ${EVENTS_INDEX}`);
  } catch (error) {
    const type = (error as { body?: { error?: { type?: string } } })?.body?.error?.type;
    if (type !== 'resource_already_exists_exception') {
      throw error;
    }
  }
};

/**
 * Preferred read path: the Fleet global checkpoint APIs. If they are not usable by the internal
 * user (or on this deployment), it falls back to shard stats plus a refresh and an ordinary search.
 */
export const createEventsStore = (esClient: ElasticsearchClient, logger: Logger): EventsStore => {
  let useFleetApis = true;

  const fallBack = (reason: unknown) => {
    if (!useFleetApis) return;
    useFleetApis = false;
    const detail = reason instanceof Error ? reason.message : String(reason);
    logger.warn(
      `Fleet checkpoint APIs are not usable; falling back to shard stats and refresh: ${detail}`
    );
  };

  const getCheckpointFromFleet = async (): Promise<number> => {
    const { global_checkpoints: checkpoints } = await esClient.fleet.globalCheckpoints({
      index: EVENTS_INDEX,
    });
    return checkpoints[0] ?? -1;
  };

  const getCheckpointFromStats = async (): Promise<number> => {
    const stats = await esClient.indices.stats({
      index: EVENTS_INDEX,
      level: 'shards',
      metric: 'docs',
    });
    const shards = Object.values(stats.indices ?? {})[0]?.shards?.['0'] ?? [];
    const primary = shards.find((shard) => shard.routing?.primary);
    return primary?.seq_no?.global_checkpoint ?? -1;
  };

  const toStoredEvents = (
    hits: Array<{ _seq_no?: number; _source?: EventDocument | undefined }>
  ): StoredEvent[] =>
    hits.flatMap(({ _seq_no: seqNo, _source: source }) =>
      seqNo === undefined || !source
        ? []
        : [
            {
              seqNo,
              id: source.event_id,
              topic: source.topic,
              acceptedAt: source.accepted_at,
              data: source.data,
            },
          ]
    );

  return {
    async append({ id, topic, acceptedAt, serializedData }) {
      const data: unknown = JSON.parse(serializedData);
      if (!isPlainObject(data)) {
        throw new Error(
          `Durable pubsub events must have object data; topic "${topic}" event "${id}" does not.`
        );
      }

      try {
        await esClient.create<EventDocument>({
          index: EVENTS_INDEX,
          id: getEventDocId(topic, id),
          document: { topic, event_id: id, accepted_at: acceptedAt, data },
          refresh: false,
        });
      } catch (error) {
        // The same event was already stored.
        if (!isStatus(error, 409)) throw error;
      }
    },

    async getGlobalCheckpoint() {
      if (useFleetApis) {
        try {
          return await getCheckpointFromFleet();
        } catch (error) {
          fallBack(error);
        }
      }
      return getCheckpointFromStats();
    },

    async readPage({ topic, afterSeqNo, throughSeqNo, size }) {
      const query = {
        bool: {
          filter: [
            { term: { topic } },
            { range: { _seq_no: { gt: afterSeqNo, lte: throughSeqNo } } },
          ],
        },
      };
      const common = {
        index: EVENTS_INDEX,
        query,
        sort: [{ _seq_no: 'asc' as const }],
        size,
        seq_no_primary_term: true,
        _source: ['topic', 'event_id', 'accepted_at', 'data'],
      };

      if (useFleetApis) {
        try {
          const response = await esClient.fleet.search<EventDocument>({
            ...common,
            wait_for_checkpoints: [throughSeqNo],
          });
          return toStoredEvents(response.hits.hits);
        } catch (error) {
          fallBack(error);
        }
      }

      // Without checkpoint-gated search, make everything up to the checkpoint visible first.
      await esClient.indices.refresh({ index: EVENTS_INDEX });
      const response = await esClient.search<EventDocument>(common);
      return toStoredEvents(response.hits.hits);
    },
  };
};
