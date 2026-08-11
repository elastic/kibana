/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { ServerTriggerDefinition } from '@kbn/workflows-extensions/server';
import type { AlertActionEvent } from '../../alert_action_event_publisher/events';

/**
 * Self-contained binding for one alert-action → workflow-trigger mapping.
 *
 * Each binding co-locates the four pieces of state that must agree across
 * the codebase for a single trigger:
 *
 *  - `eventType`  — the bus event-type discriminator that produces this trigger.
 *  - `triggerId`  — the workflows-extensions trigger id (e.g. `alertingV2.episodeAssigned`).
 *  - `definition` — the `ServerTriggerDefinition` registered with workflows-extensions
 *                   (carries the Zod payload schema downstream emits must satisfy).
 *  - `toPayload`  — pure function from the bus event shape to the
 *                   schema-conforming workflow payload.
 */
export interface AlertActionWorkflowTriggerBinding<
  TEvent extends AlertActionEvent = AlertActionEvent,
  TSchema extends z.ZodObject = z.ZodObject
> {
  readonly eventType: TEvent['type'];
  readonly triggerId: string;
  readonly definition: ServerTriggerDefinition<TSchema>;
  toPayload(event: TEvent): z.infer<TSchema>;
}
