/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';

/** `target` value that delivers an event to every node (broadcast). */
export const BROADCAST_TARGET = 'all';

export interface EventTypeDefinition {
  /** Topic, e.g. `rule.created`. Subscribers filter on this. */
  type: string;
  /** Optional payload schema, validated at publish time. */
  schema?: ObjectType;
}

export interface PublishEventParams<Payload = unknown> {
  type: string;
  payload: Payload;
  /**
   * `'all'` (broadcast, default) or a specific node id / list of node ids
   * (directed). Directed delivery has no failover: if the target node is gone
   * by the time the event is published, no one processes it.
   */
  target?: string | string[];
  /** Space id, carried on the event for space-aware handlers. */
  space?: string;
  /** Optional routing key for per-partition ordering (future, multi-shard). */
  partition?: string;
}

/** An event as delivered to a subscriber handler. */
export interface BusEvent<Payload = unknown> {
  /** Unique, time-ordered id (UUIDv7). Idempotency key for handlers. */
  id: string;
  type: string;
  target: string | string[];
  /** Publishing node id. */
  source: string;
  space?: string;
  partition?: string;
  payload: Payload;
  /** ISO timestamp assigned at publish. */
  timestamp: string;
}

export type EventHandler<Payload = unknown> = (event: BusEvent<Payload>) => Promise<void> | void;

export interface SubscribeOptions {
  /** Event types this subscription is interested in. */
  types: string[];
  /**
   * Stable logical consumer id. Required for durable subscriptions; the cursor
   * is persisted per consumer, not per node.
   */
  consumer?: string;
  /**
   * `true` = at-least-once durable consumer backed by a Task Manager task with
   * a persisted cursor (single-runner with failover). `false`/omitted =
   * at-most-once ephemeral per-node subscriber starting from "now".
   */
  durable?: boolean;
}

export interface Subscription {
  unsubscribe: () => void;
}

export interface EventBusSetup {
  registerEventType: (definition: EventTypeDefinition) => void;
}

export interface EventBusStart {
  publish: <Payload = unknown>(event: PublishEventParams<Payload>) => Promise<void>;
  subscribe: <Payload = unknown>(
    options: SubscribeOptions,
    handler: EventHandler<Payload>
  ) => Subscription;
}
