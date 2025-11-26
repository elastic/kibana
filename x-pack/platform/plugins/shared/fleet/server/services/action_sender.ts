/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { TelemetryEventsSender } from '../telemetry/sender';
import type { AgentActionType } from '../types';

export interface AgentActionEvent {
  eventType: AgentActionType;
  agentCount: number;
}

export const FLEET_ACTIONS_CHANNEL_NAME = 'fleet-actions';

export function sendActionTelemetryEvents(
  logger: Logger,
  eventsTelemetry: TelemetryEventsSender | undefined,
  actionEvent: AgentActionEvent
) {
  if (eventsTelemetry === undefined) {
    return;
  }

  try {
    eventsTelemetry.queueTelemetryEvents(FLEET_ACTIONS_CHANNEL_NAME, [actionEvent]);
  } catch (exc) {
    logger.error(`queuing telemetry events failed ${exc}`);
  }
}
