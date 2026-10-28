/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';

/** Maximum length of an app id carried on an event origin. */
export const EVENT_ORIGIN_APP_MAX_LENGTH = 64;

/**
 * Channels an event can be published through.
 *
 * - `system`: Kibana acting on its own behalf (for example a task).
 * - `ui`: a request made by the Kibana browser app.
 * - `api`: any other request.
 */
export const EVENT_ORIGIN_CHANNELS = ['system', 'ui', 'api'] as const;

export const eventOriginChannelSchema = lazySchema(() => z.enum(EVENT_ORIGIN_CHANNELS));

export type EventOriginChannel = z.infer<typeof eventOriginChannelSchema>;

/**
 * App id carried on an event origin. Bounded so telemetry cannot
 * record an arbitrary or very long value.
 */
export const eventOriginAppSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(EVENT_ORIGIN_APP_MAX_LENGTH)
    .regex(
      /^[A-Za-z0-9_.:-]+$/,
      'Must contain only letters, digits, underscores, dots, colons, and hyphens.'
    )
    .describe('App the event was published from.')
);

export type EventOriginApp = z.infer<typeof eventOriginAppSchema>;

/** Who published an event. */
export const EVENT_ORIGIN_ACTORS = ['user', 'internal'] as const;

export const eventOriginActorSchema = lazySchema(() =>
  z
    .enum(EVENT_ORIGIN_ACTORS)
    .describe(
      'Who published the event: `user` for a request carrying credentials, or `internal` for the Kibana internal user acting on its own.'
    )
);

export type EventOriginActor = z.infer<typeof eventOriginActorSchema>;

/**
 * Who published an alerting event, and where it came from.
 *
 * `channel` is derived from the request. `app` is set when a caller configures
 * one, or when a UI request names one in the execution context. Publishers
 * attach the actor.
 */
export const eventOriginSchema = lazySchema(() =>
  z.object({
    actor: eventOriginActorSchema,
    channel: eventOriginChannelSchema,
    app: eventOriginAppSchema.optional(),
  })
);

export type EventOrigin = z.infer<typeof eventOriginSchema>;

/** Channel and optional app derived from a request, before the actor is attached. */
export type RequestEventOrigin = Omit<EventOrigin, 'actor'>;
