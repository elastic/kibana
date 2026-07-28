/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

export interface EventTypeDefinition {
  /** Dot-delimited identifier, e.g. `github.pull_request.opened`. */
  type: string;
  /** When provided, validates the event payload at publish time. */
  payloadSchema?: ObjectType;
}

/** An event as submitted by a producer. */
export interface PublishEventParams {
  type: string;
  /** Flat key/values used to route the event to listeners. */
  attributes?: Record<string, string>;
  payload?: unknown;
}

/** An event as delivered to a listener. */
export interface RouterEvent {
  id: string;
  type: string;
  attributes: Record<string, string>;
  /**
   * Validated against the event type's `payloadSchema` when one is registered,
   * otherwise opaque. Listeners narrow this themselves.
   */
  payload: unknown;
  /** ISO timestamp assigned when the event was accepted. */
  receivedAt: string;
  spaceId: string;
}

/**
 * Declarative subscription filter, evaluated in memory on the node that
 * accepted the event, so it must stay cheap and side-effect free.
 */
export interface ListenerFilter {
  /** Matches when the event type is one of these. At least one is required. */
  types: string[];
  /**
   * Every entry must match: a string requires equality, an array requires
   * membership. An event missing the attribute never matches.
   */
  attributes?: Record<string, string | string[]>;
}

export interface ListenerContext {
  /**
   * The request that published the event. Pass it to `taskManager.schedule` so
   * the enqueued work runs with the publisher's privileges.
   */
  request: KibanaRequest;
}

/**
 * Handlers run inline on the ingest request, so they must only enqueue durable
 * work (schedule a task, emit a workflow trigger) and return. Anything slower
 * belongs in the work they enqueue, not here.
 */
export type ListenerHandler = (event: RouterEvent, context: ListenerContext) => Promise<void>;

export interface ListenerDefinition {
  id: string;
  filter: ListenerFilter;
  handler: ListenerHandler;
}

export interface ListenerFailure {
  listenerId: string;
  message: string;
}

export interface PublishResult {
  id: string;
  type: string;
  /** Listeners that accepted the event and enqueued their work. */
  enqueued: string[];
  /**
   * Listeners that did not accept the event. A non-empty list means the event
   * was only partially delivered and the producer should retry.
   */
  failures: ListenerFailure[];
}

export interface EventRouterSetup {
  registerEventType: (definition: EventTypeDefinition) => void;
  registerListener: (definition: ListenerDefinition) => void;
}

export interface EventRouterStart {
  /** Publishes an event through the same path the HTTP route uses. */
  publish: (params: PublishEventParams, request: KibanaRequest) => Promise<PublishResult>;
}

export interface EventRouterSetupDeps {
  taskManager?: TaskManagerSetupContract;
}

export interface EventRouterStartDeps {
  taskManager?: TaskManagerStartContract;
}
