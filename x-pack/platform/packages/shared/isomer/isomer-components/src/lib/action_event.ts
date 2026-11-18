/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';

/** Room left in a Slack `action_id` for the position that keeps it unique in its block. */
const EVENT_NAME_MAX_CHARS = 64;

/** An event name, which Slack carries as the start of an `action_id`. */
export const eventNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9_.-]+$/)
  .max(EVENT_NAME_MAX_CHARS);

/** An Isomer `ActionEventRef`: an event the host handles, raised by the reader. */
export const actionEventSchema = z
  .object({
    name: eventNameSchema.describe('The event the host handles, such as "prompt_response".'),
    context: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('JSON data passed to the host with the event.'),
  })
  .strict();

/** The Slack `action_id` of the element at `index` of its block: `{name}:{index}`. */
export const slackActionId = (name: string, index: number): string =>
  `${name}:${index}`.slice(0, SLACK_LIMITS.actionIdChars);
