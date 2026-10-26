/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import type { AlertActionDocument } from '../../resources/datastreams/alert_actions';
import type { AlertEventDocument } from '../../resources/datastreams/alert_events';
import type { AlertEventRecord } from './types';
import type { AlertActionState } from './context_loaders/load_alert_action_states';
import type { SeriesActionState } from './context_loaders/load_series_action_states';

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
  alertActionDoc: AlertActionDocument;
  ruleEvent?: AlertEventDocument;
}

/**
 * One unit of work for a handler. Carries everything the handler needs
 * to build a {@link PreparedAction}:
 *
 * - `action` — the user-supplied body (already narrowed to `TBody`).
 * - `alertEvent` — the alert event the orchestrator resolved for this
 *   row.
 * - `alertActionDoc` — the audit doc the orchestrator has already built
 *   from `action` + `alertEvent`. Handlers pass it through unchanged,
 *   or wrap it alongside a synthetic `.rule-events` doc for lifecycle
 *   actions.
 * - `alertActionState` — the alert's current ack / assignee / tags, which the
 *   preconditioned handlers compare their request against. Only loaded for
 *   handlers that declare {@link ActionHandler.requiresActionState}; the
 *   rest receive the empty state and must not read it.
 * - `seriesActionState` — the series' current snooze, for the series-scoped
 *   handlers that declare {@link ActionHandler.requiresSeriesActionState};
 *   same contract as `alertActionState`.
 */
export interface HandlerItem<TBody extends CreateAlertActionBody> {
  action: TBody;
  alertEvent: AlertEventRecord;
  alertActionDoc: AlertActionDocument;
  alertActionState: AlertActionState;
  seriesActionState: SeriesActionState;
}

/**
 * Strategy contract for one `action_type`. Implementations live in their
 * own file under `handlers/` and never know anything about routes,
 * persistence, telemetry, or sibling handlers.
 *
 * Handlers are pure and synchronous: preconditions are evaluated and
 * the write payload is built from `item` alone. A handler that needs
 * more than the alert event declares it with
 * {@link ActionHandler.requiresActionState} and reads it off the item;
 * the orchestrator owns every round-trip.
 *
 * Type parameter `TBody` is the clean discriminated-union variant for
 * this action_type (e.g. the `ack` body, not the union), so each
 * handler pulls off the fields it needs without `in` checks.
 */
export interface ActionHandler<TBody extends CreateAlertActionBody = CreateAlertActionBody> {
  /**
   * Declares that `prepare` reads `item.alertActionState`, so the orchestrator
   * only pays for the `.alert-actions` round-trip when a request contains
   * one of these actions.
   */
  readonly requiresActionState?: boolean;
  /** Same as {@link ActionHandler.requiresActionState}, for `item.seriesActionState`. */
  readonly requiresSeriesActionState?: boolean;
  /**
   * Pure, synchronous precondition check + doc build. Throws Boom 4xx on
   * precondition failure (same error codes routes already surface); the
   * bulk path records 400/404/409 per item, the single path lets them
   * propagate. No I/O — everything needed is already on `item`.
   */
  prepare(item: HandlerItem<TBody>): PreparedAction;
}
