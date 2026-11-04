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
import type { ActionHandler, HandlerItem, PreparedAction } from '../handler';
import { ackHandler, unackHandler } from './ack';
import { activateHandler } from './activate';
import { assignHandler } from './assign';
import { deactivateHandler } from './deactivate';
import { snoozeHandler } from './snooze';
import { tagHandler } from './tag';
import { unsnoozeHandler } from './unsnooze';

/**
 * Exhaustive map from `action_type` to its handler. The mapped type
 * forces a TS compile error any time a new `AlertEpisodeActionType`
 * value is introduced without a matching handler — that's the entire
 * point of the registry approach.
 */
export type ActionHandlersRegistry = {
  [T in AlertEpisodeActionType]: ActionHandler<Extract<CreateAlertActionBody, { action_type: T }>>;
};

/**
 * Canonical handler registry. Typed as the **exhaustive**
 * {@link ActionHandlersRegistry}: adding a new `AlertEpisodeActionType`
 * value without a matching slot is a TS compile error here. `Readonly`
 * blocks mutation at compile time — consumers get the map by value,
 * they cannot swap or replace slots at runtime.
 */
export const ACTION_HANDLERS: Readonly<ActionHandlersRegistry> = {
  [ALERT_EPISODE_ACTION_TYPE.ACK]: ackHandler,
  [ALERT_EPISODE_ACTION_TYPE.UNACK]: unackHandler,
  [ALERT_EPISODE_ACTION_TYPE.ASSIGN]: assignHandler,
  [ALERT_EPISODE_ACTION_TYPE.TAG]: tagHandler,
  [ALERT_EPISODE_ACTION_TYPE.SNOOZE]: snoozeHandler,
  [ALERT_EPISODE_ACTION_TYPE.UNSNOOZE]: unsnoozeHandler,
  [ALERT_EPISODE_ACTION_TYPE.DEACTIVATE]: deactivateHandler,
  [ALERT_EPISODE_ACTION_TYPE.ACTIVATE]: activateHandler,
};

/**
 * Whether an action's handler reads the alert's ack / assignee / tags, i.e.
 * whether the orchestrator has to load that state before preparing it.
 */
export const requiresActionState = (actionType: AlertEpisodeActionType): boolean =>
  ACTION_HANDLERS[actionType].requiresActionState === true;

/**
 * Whether an action's handler reads the series' snooze, i.e. whether the
 * orchestrator has to load that state before preparing it.
 */
export const requiresSeriesActionState = (actionType: AlertEpisodeActionType): boolean =>
  ACTION_HANDLERS[actionType].requiresSeriesActionState === true;

/**
 * Calls the handler that `handlers` registers for
 * `item.action.action_type`. The cast on the lookup is sound because
 * the registry is a mapped type keyed by that exact discriminant —
 * `handlers[t]` IS the handler for actions of type `t`. TS just can't
 * follow the correlation across the indexed access, so we assert it
 * here in one place.
 */
export const prepareWithHandler = (
  item: HandlerItem<CreateAlertActionBody>,
  handlers: Readonly<ActionHandlersRegistry>
): PreparedAction => {
  const handler = handlers[item.action.action_type] as ActionHandler<CreateAlertActionBody>;
  return handler.prepare(item);
};
