/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z, ZodObject } from '@kbn/zod/v4';

/** Server-side definition of a conversation event type. */
export interface ConversationEventTypeDefinition<
  TType extends string = string,
  TSchema extends ZodObject<any> = ZodObject<any>
> {
  /** Unique discriminator written to `event.type` in the stored document. */
  type: TType;
  /** Zod schema used to validate the event payload. */
  payloadSchema: TSchema;
}

/** The payload type inferred from a registered event type definition. */
export type ConversationEventPayloadOf<TSchema extends ZodObject<any>> = z.infer<TSchema>;
