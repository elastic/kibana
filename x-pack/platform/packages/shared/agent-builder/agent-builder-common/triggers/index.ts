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

/**
 * Trigger ID for the conversation updated event: emitted after every conversation write that
 * changes something a subscriber can observe.
 */
export const ConversationUpdatedTriggerId = 'ai.conversation.updated' as const;

/** The code path that performed a conversation write. */
export const conversationWriteSources = [
  'execution',
  'http_api',
  'server_api',
  'workflow',
] as const;
export type ConversationWriteSource = (typeof conversationWriteSources)[number];

/** The kinds of change a conversation write can make. */
export const conversationChangeKinds = [
  'created',
  'events',
  'attachments',
  'metadata',
  'title',
  'template',
  'access',
] as const;
export type ConversationChangeKind = (typeof conversationChangeKinds)[number];

export interface ConversationUpdatedTriggerEvent {
  conversationId: string;
  /** Set when the conversation has a template. */
  templateId?: string;
  /** Set when the conversation is a child conversation (e.g. a persistent sub-agent). */
  parentId?: string;
  /** The code path that performed the write. */
  source: ConversationWriteSource;
  /** What this write changed. Never empty. */
  changeKinds: ConversationChangeKind[];
  /** Types of the events this write added, de-duplicated. */
  eventTypes: string[];
  /** Actor types of the events this write added, de-duplicated. */
  actorTypes: string[];
  /** The execution this write persisted, when it persisted one. */
  executionId?: string;
  /** Types of the attachments this write changed, de-duplicated. */
  attachmentTypes: string[];
  /** Ids of the attachments this write changed. */
  attachmentIds: string[];
  /** Names of the metadata fields whose stored value changed. */
  changedFields: string[];
}
