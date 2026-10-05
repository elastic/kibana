/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentEventSource } from '../chat/timeline_events';

/**
 * Trigger ID for the conversation metadata updated event.
 * Import this constant when building workflows that react to conversation metadata changes.
 */
export const ConversationMetadataUpdatedTriggerId = 'ai.conversation.metadataUpdated' as const;

/**
 * Trigger ID for any persisted conversation change: messages, timeline events,
 * attachments, metadata, and attribute updates.
 */
export const ConversationUpdatedTriggerId = 'ai.conversation.updated' as const;

export type ConversationChangeKind = 'event' | 'attachment' | 'metadata' | 'attributes';

export interface ConversationUpdatedEvent {
  /** The ID of the conversation that changed. */
  conversationId: string;
  /** The template that defines the metadata schema for this conversation. */
  templateId?: string;
  /** The ID of the parent conversation, when this conversation is a child. */
  parentId?: string;
  /** Which parts of the conversation document this write touched. */
  changeKinds: ConversationChangeKind[];
  /** Timeline event types included in this write. Empty when the write was not an event append. */
  eventTypes: string[];
  /** Metadata field names that changed. Empty when metadata was not written. */
  changedFields: string[];
  /**
   * True when the write added content a summary should reflect: a message, an attachment,
   * a custom event, a non-summary metadata change, or an attribute such as the title.
   * Execution lifecycle events (`execution_step` and the other run events) leave this false.
   */
  contentChange: boolean;
  /** True when the only change is the `summary` metadata field. */
  summaryOnly: boolean;
}

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

export const ConversationAttachmentAddedTriggerId = 'ai.attachmentAdded' as const;
export const ConversationAttachmentUpdatedTriggerId = 'ai.attachmentUpdated' as const;
export const ConversationAttachmentDeletedTriggerId = 'ai.attachmentDeleted' as const;

export interface AttachmentAddedTriggerEvent {
  conversationId: string;
  attachmentId: string;
  attachmentType: string;
  currentVersion: number;
  source: AttachmentEventSource;
}

export interface AttachmentUpdatedTriggerEvent {
  conversationId: string;
  attachmentId: string;
  attachmentType: string;
  previousVersion: number;
  currentVersion: number;
  source: AttachmentEventSource;
}

export interface AttachmentDeletedTriggerEvent {
  conversationId: string;
  attachmentId: string;
  attachmentType: string;
  hardDelete: boolean;
  source: AttachmentEventSource;
}
