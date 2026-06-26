/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { EventsService } from '../services/events/events_service';

type PendingAttachmentsGetter = () => ConversationAttachment[] | undefined;
type ScrollToInlineAttachmentHandler = (attachmentId: string) => void;
type AttachmentLinkStateListener = () => void;

let eventsService: EventsService | null = null;
let eventsSubscription: { unsubscribe: () => void } | null = null;
let getPendingAttachments: PendingAttachmentsGetter | null = null;
let scrollToInlineAttachmentHandler: ScrollToInlineAttachmentHandler | null = null;
const attachmentLinkStateListeners = new Set<AttachmentLinkStateListener>();

export const subscribeAttachmentLinkState = (listener: AttachmentLinkStateListener): (() => void) => {
  attachmentLinkStateListeners.add(listener);

  return () => {
    attachmentLinkStateListeners.delete(listener);
  };
};

export const notifyAttachmentLinkStateChange = (): void => {
  attachmentLinkStateListeners.forEach((listener) => {
    listener();
  });
};

export const registerAttachmentLinkEventsService = (service: EventsService): void => {
  eventsService = service;
  eventsSubscription?.unsubscribe();
  eventsSubscription = service.activeConversation$.subscribe(() => {
    notifyAttachmentLinkStateChange();
  });
};

export const clearAttachmentLinkEventsService = (): void => {
  eventsSubscription?.unsubscribe();
  eventsSubscription = null;
  eventsService = null;
};

export const registerPendingAttachmentsGetter = (getter: PendingAttachmentsGetter): void => {
  getPendingAttachments = getter;
};

export const clearPendingAttachmentsGetter = (): void => {
  getPendingAttachments = null;
};

export const getActiveConversationSnapshot = () => eventsService?.getActiveConversation() ?? null;

export const getPendingAttachmentsSnapshot = () => getPendingAttachments?.();

export const getAttachmentLinkStateSnapshot = (): string => {
  const activeConversation = getActiveConversationSnapshot();
  const pendingAttachments = getPendingAttachmentsSnapshot() ?? [];

  return [
    activeConversation?.id ?? 'new',
    activeConversation?.conversation?.id ?? 'none',
    pendingAttachments.map((attachment) => attachment.id ?? attachment.type).join('|'),
  ].join(':');
};

export const registerScrollToInlineAttachmentHandler = (
  handler: ScrollToInlineAttachmentHandler
): void => {
  scrollToInlineAttachmentHandler = handler;
};

export const clearScrollToInlineAttachmentHandler = (): void => {
  scrollToInlineAttachmentHandler = null;
};

export const scrollToInlineAttachmentFromBridge = (attachmentId: string): void => {
  scrollToInlineAttachmentHandler?.(attachmentId);
};
