/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { IconType } from '@elastic/eui';
import type { ConversationEvent, ValidConversationEventType } from '@kbn/agent-builder-common';

/**
 * Context passed to a custom conversation event renderer.
 */
export interface ConversationEventRenderContext {
  /** The conversation the event belongs to. */
  conversationId: string;
  /** True while an execution is in flight in this conversation. */
  isStreaming?: boolean;
}

/** Header metadata for a custom conversation event (inline / canvas). */
export interface ConversationEventHeaderData {
  /** Icon displayed in the avatar column. Required — custom events must declare a visual identity. */
  icon: IconType;
  /** Accessible title for the icon; used as aria-label. */
  iconTitle?: string;
  /** Short label describing the event type, shown in the event header. */
  label?: string;
}

/**
 * Browser-side UI definition for rendering a custom conversation event type.
 *
 * The server validates `data` against the type's `payloadSchema` when the event is written. The
 * timeline renders an event only when its type has a registered UI definition, and passes the
 * stored event to `render` as-is.
 *
 * @example
 * ```ts
 * const textNoteDefinition: ConversationEventUIDefinition<'text_note', TextNoteEventData> = {
 *   type: 'text_note',
 *   render: (event, { conversationId }) => <TextNoteRenderer data={event.data} />,
 *   getHeader: () => ({ icon: 'document', label: 'Note' }),
 * };
 * ```
 */
export interface ConversationEventUIDefinition<TType extends string = string, TData = unknown> {
  /** Unique discriminator — must match the server-side registration's `type`. */
  type: TType;
  /**
   * Renders the event in the conversation timeline.
   *
   * Registered definitions are plugin-owned code. The timeline wraps the output in an error
   * boundary so a throwing renderer cannot take down the entire chat.
   */
  render: (
    event: ConversationEvent<TType, TData>,
    ctx: ConversationEventRenderContext
  ) => ReactNode;
  /**
   * Optional header metadata shown above the rendered content.
   */
  getHeader?: (
    event: ConversationEvent<TType, TData>,
    ctx: ConversationEventRenderContext
  ) => ConversationEventHeaderData | undefined;
}

/**
 * The intersection that enforces the compile-time {@link ValidConversationEventType} guard at the
 * `register` call site.
 */
export type ValidatedConversationEventUIDefinition<
  TType extends string,
  TData
> = ConversationEventUIDefinition<TType, TData> & { type: ValidConversationEventType<TType> };

/**
 * Public-facing contract for the browser-side conversation event type registry.
 *
 * Obtain via `AgentBuilderPluginStart.conversationEvents`. Note the naming distinction:
 * - `conversationEvents` (this registry) — stores custom conversation event type *definitions*,
 *   used to render stored `ConversationEvent` objects in the timeline.
 * - `events` — the live SSE chat-event stream ({@link EventsServiceStartContract}).
 *
 * Registration must happen during the consumer plugin's `start()` lifecycle, before any
 * conversation timeline mounts. The registry is a plain `Map` with no observability: late
 * registrations do not trigger a re-render.
 */
export interface ConversationEventsServiceStartContract {
  /**
   * Registers a UI definition for a custom conversation event type.
   *
   * Throws if the type name is already registered, contains the id delimiter (`::`), is a
   * reserved name (`execution`, `step`), or shadows a built-in timeline event type.
   */
  register: <TType extends string, TData = unknown>(
    definition: ValidatedConversationEventUIDefinition<TType, TData>
  ) => void;
  /** Returns the UI definition for a type, or `undefined` if none is registered. */
  getUiDefinition: (type: string) => ConversationEventUIDefinition | undefined;
  /** Returns `true` if a UI definition is registered for the given type. */
  has: (type: string) => boolean;
  /** Returns all registered UI definitions in insertion order. */
  list: () => ConversationEventUIDefinition[];
}
