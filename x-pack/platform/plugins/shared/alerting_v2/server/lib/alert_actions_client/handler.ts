/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import type { AlertAction } from '../../resources/datastreams/alert_actions';
import type { AlertEvent } from '../../resources/datastreams/alert_events';
import type { QueryServiceContract } from '../services/query_service/query_service';
import type { AlertEventRecord } from './types';

/**
 * Prepared write payload for one alert action. The audit `.alert-actions`
 * doc is always present; lifecycle actions (`deactivate` / `activate`)
 * additionally carry the synthetic `.rule-events` doc that flips
 * `episode.status` so the UI sees the new state without waiting for the
 * next rule run.
 *
 * Producing this struct is side-effect-free — preconditions are evaluated
 * and docs are built, but nothing is indexed and no domain event is
 * emitted until the orchestrator persists the batch and emits the
 * domain events.
 */
export interface PreparedAction {
  alertActionDoc: AlertAction;
  ruleEvent?: AlertEvent;
}

/**
 * One unit of work for a handler: the user-supplied `action` body plus
 * the alert event the orchestrator resolved (and silently skipped
 * pairing for, when applicable).
 *
 * `TBody` is the **clean** discriminated-union variant — NOT the bulk
 * intersection `BulkCreateAlertActionItemBody`. Bulk items are
 * structurally assignable to this shape, so the orchestrator can hand
 * them through without any narrowing.
 */
export interface HandlerItem<TBody extends CreateAlertActionBody> {
  action: TBody;
  alertEvent: AlertEventRecord;
}

/**
 * Per-item context the orchestrator hands to `prepare`. Everything in
 * here is already resolved — the handler never needs to do I/O during
 * `prepare`. `context` is whatever the handler's own `loadContext`
 * returned (or `undefined` for handlers with no preload).
 */
export interface HandlerPrepareContext<TCtx> {
  alertActionDoc: AlertAction;
  userProfileUid: string | null;
  context: TCtx;
}

/**
 * The services a handler is allowed to use during its `loadContext`
 * preload. Deliberately narrow: handlers do not see the storage
 * service, the event publisher, or any other orchestrator-owned
 * collaborator — those concerns stay in the client.
 */
export interface HandlerServices {
  spaceId: string;
  queryService: QueryServiceContract;
}

/**
 * Strategy contract for one `action_type`. Implementations live in their
 * own file under `handlers/` and never know anything about routes,
 * persistence, telemetry, or sibling handlers.
 *
 * Type parameters:
 * - `TBody` — the clean discriminated-union variant for this action_type
 *   (e.g. the `ack` body, not the union). Lets each handler pull off the
 *   fields it actually needs without `in` checks.
 * - `TCtx` — the handler's own context shape. Defaults to `void`,
 *   matching handlers with no preload.
 */
export interface ActionHandler<
  TBody extends CreateAlertActionBody = CreateAlertActionBody,
  TCtx = void
> {
  /**
   * Optional preload. The orchestrator calls this once per handler per
   * request with every item routed to that handler — single-action
   * requests receive a one-element `items` array, bulk requests receive
   * the items grouped by `action_type`. Implementations should issue at
   * most one ES|QL round-trip per dependency. Omit when the handler has
   * no preload (the orchestrator passes `undefined` as `context`).
   *
   * When the same data ends up being loaded by **two or more** handlers
   * in the same request, promote that loader to a request-scoped shared
   * helper rather than letting each handler issue its own ES|QL.
   * Single-consumer loads stay here so each handler keeps its data
   * dependencies declared locally.
   */
  loadContext?(items: ReadonlyArray<HandlerItem<TBody>>, services: HandlerServices): Promise<TCtx>;

  /**
   * Pure, synchronous precondition check + doc build. Throws Boom 4xx on
   * precondition failure (same error codes routes already surface); the
   * bulk path catches 400/404 and silent-skips, the single path lets
   * them propagate. No I/O — everything needed is already on `item` or
   * `ctx`.
   */
  prepare(item: HandlerItem<TBody>, ctx: HandlerPrepareContext<TCtx>): PreparedAction;
}
