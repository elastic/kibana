/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationAttachmentChange } from '../../services/conversation/client/attachment_diff';

export interface ConversationMetadataPatchedPayload {
  conversationId: string;
  templateId?: string;
  parentId?: string;
  changedFields: string[];
}

export interface ConversationAttachmentsChangedPayload {
  conversationId: string;
  changes: ConversationAttachmentChange[];
}

type MetadataPatchedListener = (
  request: KibanaRequest,
  payload: ConversationMetadataPatchedPayload
) => void;

type AttachmentsChangedListener = (
  request: KibanaRequest,
  payload: ConversationAttachmentsChangedPayload
) => void;

/**
 * Lightweight event bus for conversation lifecycle events.
 * Listeners registered here are called after a successful write.
 */
export interface ConversationEventBus {
  onMetadataPatched(listener: MetadataPatchedListener): void;
  emitMetadataPatched(request: KibanaRequest, payload: ConversationMetadataPatchedPayload): void;
  onAttachmentsChanged(listener: AttachmentsChangedListener): void;
  emitAttachmentsChanged(
    request: KibanaRequest,
    payload: ConversationAttachmentsChangedPayload
  ): void;
}

export const createConversationEventBus = (): ConversationEventBus =>
  new ConversationEventBusImpl();

class ConversationEventBusImpl implements ConversationEventBus {
  private readonly metadataPatchedListeners: MetadataPatchedListener[] = [];
  private readonly attachmentsChangedListeners: AttachmentsChangedListener[] = [];

  onMetadataPatched(listener: MetadataPatchedListener): void {
    this.metadataPatchedListeners.push(listener);
  }

  emitMetadataPatched(request: KibanaRequest, payload: ConversationMetadataPatchedPayload): void {
    for (const listener of this.metadataPatchedListeners) {
      listener(request, payload);
    }
  }

  onAttachmentsChanged(listener: AttachmentsChangedListener): void {
    this.attachmentsChangedListeners.push(listener);
  }

  emitAttachmentsChanged(
    request: KibanaRequest,
    payload: ConversationAttachmentsChangedPayload
  ): void {
    for (const listener of this.attachmentsChangedListeners) {
      listener(request, payload);
    }
  }
}
