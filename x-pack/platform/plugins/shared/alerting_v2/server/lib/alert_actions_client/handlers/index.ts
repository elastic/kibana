/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  type AlertEpisodeActionType,
  type CreateAlertActionBody,
} from '@kbn/alerting-v2-schemas';
import type {
  ActionHandler,
  HandlerItem,
  HandlerPrepareContext,
  HandlerServices,
  PreparedAction,
} from '../handler';
import { ackHandler } from './ack';
import { assignHandler } from './assign';
import { snoozeHandler } from './snooze';
import { tagHandler } from './tag';
import { unackHandler } from './unack';
import { unsnoozeHandler } from './unsnooze';

/**
 * Exhaustive map from `action_type` to its handler. The mapped type
 * forces a TS compile error any time a new `AlertEpisodeActionType`
 * value is introduced without a matching handler — that's the entire
 * point of the registry approach.
 */
export type ActionHandlersRegistry = {
  [T in AlertEpisodeActionType]: ActionHandler<
    Extract<CreateAlertActionBody, { action_type: T }>,
    unknown
  >;
};

/**
 * Canonical handler registry. Module-private on purpose: the only
 * production registration site is this declaration, and external
 * callers reach the registry exclusively through the invocation
 * helpers below — they cannot swap or hijack handlers at runtime.
 *
 * Typed as `Partial<…>` for the duration of the multi-step migration:
 * `deactivate` and `activate` are still served by the orchestrator's
 * in-class switch (Steps 5–6 will move them). Once every action_type
 * has a handler we tighten this to {@link ActionHandlersRegistry} and
 * the missing-handler defensive throw in {@link resolveHandlerOrThrow}
 * becomes unreachable.
 */
const ACTION_HANDLERS: Partial<ActionHandlersRegistry> = {
  [ALERT_EPISODE_ACTION_TYPE.ACK]: ackHandler,
  [ALERT_EPISODE_ACTION_TYPE.UNACK]: unackHandler,
  [ALERT_EPISODE_ACTION_TYPE.ASSIGN]: assignHandler,
  [ALERT_EPISODE_ACTION_TYPE.TAG]: tagHandler,
  [ALERT_EPISODE_ACTION_TYPE.SNOOZE]: snoozeHandler,
  [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: unsnoozeHandler,
};

/**
 * Read accessor for {@link ACTION_HANDLERS}. Returns the live registry
 * reference rather than a copy so callers can use the result for
 * exhaustiveness checks (e.g. "every `AlertEpisodeActionType` has an
 * entry") without paying for a per-call clone. Production code should
 * not mutate the returned object — production registration happens
 * only at the declaration site above. The test suite uses the live
 * reference to set up isolated scenarios and restores it via
 * `afterEach`/`afterAll`.
 */
export const getActionHandlers = (): Partial<ActionHandlersRegistry> => ACTION_HANDLERS;

/**
 * Single resolution point. Lives behind a function so the invocation
 * helpers below stay one-liners and the "no handler registered" error
 * message is produced in exactly one place — easier to grep, easier to
 * change once the registry is exhaustive.
 *
 * The cast bridges a TS variance gap (see the long-form note next to
 * each invocation helper below): the runtime invariant guarantees the
 * handler accepts the actual item shape, but TS cannot follow that
 * correlation across the indexed access.
 */
const resolveHandlerOrThrow = (
  actionType: AlertEpisodeActionType
): ActionHandler<CreateAlertActionBody, unknown> => {
  const handler = ACTION_HANDLERS[actionType] as
    | ActionHandler<CreateAlertActionBody, unknown>
    | undefined;

  if (!handler) {
    throw new Error(`No handler registered for action_type "${actionType}"`);
  }

  return handler;
};

/**
 * Calls the handler registered for `item.action.action_type`. The cast
 * inside {@link resolveHandlerOrThrow} is sound because the registry is
 * a mapped type keyed by that exact discriminant — `ACTION_HANDLERS[t]`
 * IS the handler for actions of type `t`. TS just can't follow the
 * correlation across the index access, so we assert it in this single,
 * well-tested place.
 *
 * Why we don't "fix" the cast: `ActionHandler` is contravariant in
 * `TBody` through its `action` input — a narrower handler (e.g.
 * `ActionHandler<AckAlertActionBody>`) is NOT structurally assignable
 * to `ActionHandler<CreateAlertActionBody>`. The cast bridges that with
 * a runtime invariant the compiler can't see: `item.action.action_type`
 * IS the discriminant we just used to look up `handler`, so the
 * handler's `prepare` only ever touches fields that exist on the
 * runtime value.
 */
export const prepareWithHandler = (
  item: HandlerItem<CreateAlertActionBody>,
  ctx: HandlerPrepareContext<unknown>
): PreparedAction => resolveHandlerOrThrow(item.action.action_type).prepare(item, ctx);

/**
 * Runs every handler's `loadContext` (those that define one) in
 * parallel, one call per `action_type` present in the input. Returns a
 * map of `action_type` -> opaque context, consumed only via
 * {@link prepareWithHandler}.
 *
 * Handlers without a `loadContext` produce an `undefined` entry —
 * that's the canonical "this handler has no preload" signal the
 * orchestrator hands through to `prepare` as `ctx.context`. The helper
 * is unaware of whether it's serving a single-action route or a bulk
 * batch; both paths go through here so each handler has exactly one
 * place to define its preload.
 */
export const loadContextPerHandler = async (
  itemsByType: Partial<Record<AlertEpisodeActionType, Array<HandlerItem<CreateAlertActionBody>>>>,
  services: HandlerServices
): Promise<Partial<Record<AlertEpisodeActionType, unknown>>> => {
  const entries = Object.entries(itemsByType) as Array<
    [AlertEpisodeActionType, Array<HandlerItem<CreateAlertActionBody>>]
  >;

  const loaded = await Promise.all(
    entries.map(async ([type, items]) => {
      const handler = resolveHandlerOrThrow(type);
      return [type, await handler.loadContext?.(items, services)] as const;
    })
  );

  return Object.fromEntries(loaded);
};
