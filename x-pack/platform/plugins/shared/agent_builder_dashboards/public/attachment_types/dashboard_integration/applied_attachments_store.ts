/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { BehaviorSubject, type Observable } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createApplyQueue } from './apply_queue';
import { createAttachmentLinks } from './attachment_links';
import { createConversationTracker } from './conversation_tracker';

/**
 * Tracks attachments applied to the dashboard app, so the state changes an apply causes
 * are not mistaken for manual changes.
 */
export interface AppliedAttachmentsStore {
  setActiveConversationId: (conversationId: string | undefined) => void;
  /** The attachment of the active conversation the dashboard was applied from or staged as. */
  getLinkedAttachmentId: (api: DashboardApi) => string | undefined;
  setLinkedAttachmentId: (api: DashboardApi, attachmentId: string) => void;
  /** Whether the dashboard is linked to an attachment of another conversation, other than the draft. */
  isLinkedInOtherConversation: (api: DashboardApi, draftAttachmentId: string) => boolean;
  /** Links the next dashboard that opens after `fromApi`, for a preview that navigates to a new dashboard. */
  linkNextDashboard: (fromApi: DashboardApi, attachmentId: string) => void;
  /** Takes over the link `linkNextDashboard` left, when the dashboard is the unsaved one it opened shortly after. */
  claimNextDashboardLink: (api: DashboardApi) => void;
  queueApply: (apply: () => Promise<void>) => Promise<void>;
  /** Whether an apply is queued or the dashboard is still settling after one. */
  isApplying: () => boolean;
  applyFinished$: Observable<void>;
  /** Conversation attachment versions the dashboard shows, as keys from `toShownVersionKey`. */
  shownVersions$: BehaviorSubject<ReadonlySet<string>>;
  /** Emits only when the shown versions changed; no argument clears them. */
  setShownVersions: (shownVersions?: ReadonlySet<string>) => void;
}

export const toShownVersionKey = (attachmentId: string, version: number): string =>
  `${attachmentId}:${version}`;

export const createAppliedAttachmentsStore = (): AppliedAttachmentsStore => {
  const conversation = createConversationTracker();
  const links = createAttachmentLinks(conversation);
  const shownVersions$ = new BehaviorSubject<ReadonlySet<string>>(new Set());

  return {
    ...links,
    ...createApplyQueue(conversation),
    setActiveConversationId: (conversationId) => {
      if (conversation.setActiveId(conversationId) === 'identified' && conversationId) {
        links.adoptNewConversationLinks(conversationId);
      }
    },
    shownVersions$,
    setShownVersions: (shownVersions = new Set()) => {
      if (!isEqual(shownVersions, shownVersions$.getValue())) {
        shownVersions$.next(shownVersions);
      }
    },
  };
};
