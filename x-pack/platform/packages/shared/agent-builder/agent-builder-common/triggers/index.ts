/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Trigger ID for the conversation metadata updated event.
 * Import this constant when building workflows that react to conversation metadata changes.
 */
export const ConversationMetadataUpdatedTriggerId = 'ai.conversation.metadataUpdated' as const;

export interface ConversationMetadataUpdatedEvent {
  /** The ID of the conversation whose metadata was updated. */
  conversationId: string;
  /** The template that defines the metadata schema for this conversation. */
  templateId?: string;
  /** The ID of the parent conversation, when this conversation is a child (e.g. a sub-agent). */
  parentId?: string;
  /** Names of the metadata fields that changed in this write. */
  changedFields: string[];
}

/** Trigger IDs for conversation attachment lifecycle events. */
export const ConversationAttachmentAddedTriggerId = 'ai.attachmentAdded' as const;
export const ConversationAttachmentUpdatedTriggerId = 'ai.attachmentUpdated' as const;
export const ConversationAttachmentDeletedTriggerId = 'ai.attachmentDeleted' as const;

/** Payload shared by all three attachment trigger events. */
export interface ConversationAttachmentEvent {
  /** The ID of the conversation. */
  conversationId: string;
  /** The ID of the attachment that was added, updated, or deleted. */
  attachmentId: string;
  /** The type of the attachment (e.g. 'text', 'esql', 'visualization'). */
  attachmentType: string;
}
