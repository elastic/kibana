/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  /**
   * How often each node's ephemeral tail loop polls the datastream when it is
   * caught up. This is the latency floor for broadcast/directed delivery.
   */
  pollInterval: schema.duration({ defaultValue: '1s' }),
  /**
   * Safety lag (Δ). The tail only consumes events with `@timestamp <= now - Δ`
   * so that documents made searchable slightly out of order (refresh delay,
   * indexing reorder, minor clock skew) are not skipped. Must comfortably
   * exceed the index refresh interval plus expected cross-node clock skew.
   */
  safetyLag: schema.duration({ defaultValue: '2s' }),
  /** Maximum number of events read per poll. */
  batchSize: schema.number({ defaultValue: 1000, min: 1, max: 10000 }),
  /** Datastream lifecycle (DSL) retention for the transport datastream. */
  retention: schema.string({ defaultValue: '7d' }),
  durable: schema.object({
    /**
     * Recurring interval for durable consumer Task Manager tasks. This is the
     * latency floor for at-least-once (durable) consumers.
     */
    pollInterval: schema.duration({ defaultValue: '3s' }),
  }),
});

export type EventBusConfig = TypeOf<typeof configSchema>;
