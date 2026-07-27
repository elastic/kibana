/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { v7 as uuidv7 } from 'uuid';
import type { EsNames } from './es/names';
import { BROADCAST_TARGET, type PublishEventParams } from './types';

export interface EventPublisherDeps {
  esClient: ElasticsearchClient;
  names: EsNames;
  /** Publishing node id (server.uuid), stored as `source`. */
  nodeId: string;
}

/**
 * Indexes a single event document into the datastream and resolves once ES
 * acks the write. Unbuffered (unlike event_log) — for a control-plane bus,
 * per-event durability matters more than write throughput. The event is not
 * searchable by tail loops until the next refresh (~1s).
 */
export class EventPublisher {
  constructor(private readonly deps: EventPublisherDeps) {}

  public async publish(params: PublishEventParams): Promise<string> {
    const id = uuidv7();
    const document = {
      '@timestamp': new Date().toISOString(),
      event: { id, type: params.type },
      target: params.target ?? BROADCAST_TARGET,
      source: this.deps.nodeId,
      space: params.space,
      partition: params.partition,
      payload: params.payload,
    };

    await this.deps.esClient.index({
      index: this.deps.names.dataStream,
      document,
      op_type: 'create',
    });

    return id;
  }
}
