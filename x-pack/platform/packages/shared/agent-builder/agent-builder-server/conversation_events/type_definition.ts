/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z, ZodObject } from '@kbn/zod/v4';
import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ConversationEvent } from '@kbn/agent-builder-common';

/** A text representation of a conversation event, as presented to the LLM. */
export interface TextConversationEventRepresentation {
  type: 'text';
  value: string;
}

/**
 * How a conversation event is represented to the LLM.
 * Currently text only; kept as a discriminated union so richer representations can be added later.
 */
export type ConversationEventRepresentation = TextConversationEventRepresentation;

/** Context provided to {@link ConversationEventTypeDefinition.format}. */
export interface ConversationEventFormatContext {
  /** The request the agent is executing on behalf of. */
  request: KibanaRequest;
  /** Id of the space the conversation belongs to. */
  spaceId: string;
}

/**
 * True for the erased `ZodObject<any>` default, whose inferred payload would be
 * `Record<string, unknown>` and reject the stored `object` payload of a generic event.
 */
type IsErasedSchema<TSchema> = TSchema extends ZodObject<infer TShape>
  ? 0 extends 1 & TShape
    ? true
    : false
  : false;

/**
 * The stored event a definition's `format` receives: payload typed by the schema when it is
 * known, the raw event envelope when the definition is handled generically (e.g. from the registry).
 */
export type ConversationEventOf<
  TType extends string,
  TSchema extends ZodObject<any>
> = IsErasedSchema<TSchema> extends true
  ? ConversationEvent<TType>
  : ConversationEvent<TType, z.infer<TSchema>>;

/** Server-side definition of a conversation event type. */
export interface ConversationEventTypeDefinition<
  TType extends string = string,
  TSchema extends ZodObject<any> = ZodObject<any>
> {
  /** Unique discriminator written to `event.type` in the stored document. */
  type: TType;
  /** Zod schema used to validate the event payload. */
  payloadSchema: TSchema;
  /**
   * Formats a stored event of this type for the LLM.
   *
   * Optional: a type without `format` is never surfaced to the agent (UI-only bookkeeping).
   * Declared with method syntax on purpose: it keeps a narrowly-typed definition assignable to
   * `ConversationEventTypeDefinition` when registering it.
   */
  format?(
    event: ConversationEventOf<TType, TSchema>,
    context: ConversationEventFormatContext
  ): MaybePromise<ConversationEventRepresentation>;
}

/** The payload type inferred from a registered event type definition. */
export type ConversationEventPayloadOf<TSchema extends ZodObject<any>> = z.infer<TSchema>;
