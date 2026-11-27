/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EventTriggerReplayEvent,
  EventTriggerReplayInput,
  TriggerEventReplaySource,
} from '@kbn/workflows';

function readTriggerEventPayload(source: TriggerEventReplaySource): Record<string, unknown> {
  const rawPayload = source.payload;
  if (rawPayload !== null && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
    return { ...(rawPayload as Record<string, unknown>) };
  }
  return {};
}

export function buildTriggerEventReplayInputs(
  source: TriggerEventReplaySource,
  currentSpaceId: string
): EventTriggerReplayInput {
  const payload = readTriggerEventPayload(source);

  const event: EventTriggerReplayEvent = {
    ...payload,
    timestamp: new Date().toISOString(),
    spaceId: currentSpaceId,
    eventChainDepth: 0,
    eventChainVisitedWorkflowIds: [],
  };

  return { event };
}

export type {
  EventTriggerReplayEvent,
  EventTriggerReplayInput,
  EventTriggerReplayPlatformFields,
  TriggerEventReplaySource,
  WorkflowsEventsLogDocumentSource,
} from '@kbn/workflows';
