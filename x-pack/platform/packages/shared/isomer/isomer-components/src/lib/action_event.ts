/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

import { plainText } from './plain_text';

/** Keeps an event name a short identifier that every surface can carry. */
const EVENT_NAME_MAX_CHARS = 64;

/** The name of an event a host handles. */
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

/**
 * How the reader answers on a surface that can't raise events, such as "Reply yes or no.": text
 * and Markdown show it, and surfaces with working buttons or inputs leave it out.
 */
export const eventFallbackSchema = plainText(300)
  .optional()
  .describe(
    'How to answer where nothing can be clicked, such as "Reply yes or no.". Shown in text and Markdown only.'
  );
