/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AttachmentTimelineEvent } from '@kbn/agent-builder-common';

export interface ConversationMetadataPatchedPayload {
  conversationId: string;
  templateId?: string;
  parentId?: string;
  changedFields: string[];
}

export interface ConversationAttachmentEventsPayload {
  conversationId: string;
  events: AttachmentTimelineEvent[];
}

type MetadataPatchedListener = (
  request: KibanaRequest,
  payload: ConversationMetadataPatchedPayload
) => void;

type AttachmentEventsListener = (
  request: KibanaRequest,
  payload: ConversationAttachmentEventsPayload
) => void;

/**
 * Lightweight event bus for conversation lifecycle events.
 * Listeners registered here are called after a successful conversation write.
 */
export interface ConversationEventBus {
  onMetadataPatched(listener: MetadataPatchedListener): void;
  emitMetadataPatched(request: KibanaRequest, payload: ConversationMetadataPatchedPayload): void;
  onAttachmentEvents(listener: AttachmentEventsListener): void;
  emitAttachmentEvents(request: KibanaRequest, payload: ConversationAttachmentEventsPayload): void;
}

/**
 * Per-request emitter handed to `ConversationClient`. Pre-binds the scoped request so the client
 * doesn't have to hold a reference to it, and lets us add new event kinds without growing the
 * client's constructor signature.
 */
export interface ScopedConversationEventEmitter {
  emitMetadataPatched(payload: ConversationMetadataPatchedPayload): void;
  emitAttachmentEvents(payload: ConversationAttachmentEventsPayload): void;
}

export const createScopedConversationEventEmitter = (
  bus: ConversationEventBus,
  request: KibanaRequest
): ScopedConversationEventEmitter => ({
  emitMetadataPatched: (payload) => bus.emitMetadataPatched(request, payload),
  emitAttachmentEvents: (payload) => bus.emitAttachmentEvents(request, payload),
});

export const createConversationEventBus = (): ConversationEventBus =>
  new ConversationEventBusImpl();

class ConversationEventBusImpl implements ConversationEventBus {
  private readonly metadataPatchedListeners: MetadataPatchedListener[] = [];
  private readonly attachmentEventsListeners: AttachmentEventsListener[] = [];

  onMetadataPatched(listener: MetadataPatchedListener): void {
    this.metadataPatchedListeners.push(listener);
  }

  emitMetadataPatched(request: KibanaRequest, payload: ConversationMetadataPatchedPayload): void {
    for (const listener of this.metadataPatchedListeners) {
      listener(request, payload);
    }
  }

  onAttachmentEvents(listener: AttachmentEventsListener): void {
    this.attachmentEventsListeners.push(listener);
  }

  emitAttachmentEvents(request: KibanaRequest, payload: ConversationAttachmentEventsPayload): void {
    for (const listener of this.attachmentEventsListeners) {
      listener(request, payload);
    }
  }
}
