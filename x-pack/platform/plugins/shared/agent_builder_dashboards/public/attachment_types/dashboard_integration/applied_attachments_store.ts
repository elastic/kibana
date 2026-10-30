/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { BehaviorSubject, Subject, type Observable } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';

/**
 * Tracks attachments applied to the dashboard app, so the state changes an apply causes
 * are not mistaken for manual changes.
 */
export interface AppliedAttachmentsStore {
  /** Sets the conversation links are read and written for; a new conversation that got its id keeps its links. */
  setActiveConversationId: (conversationId: string | undefined) => void;
  /**
   * Attachment of the active conversation the dashboard was applied from or staged as, so it
   * stays linked before it has an origin.
   */
  getLinkedAttachmentId: (api: DashboardApi) => string | undefined;
  /** Links the dashboard to an attachment of the active conversation. */
  setLinkedAttachmentId: (api: DashboardApi, attachmentId: string) => void;
  /** Whether the dashboard is linked to an attachment of another conversation, other than the draft. */
  isLinkedInOtherConversation: (api: DashboardApi, draftAttachmentId: string) => boolean;
  /**
   * Runs the apply once the previous ones settled, so the dashboard is never compared
   * while it is still applying another attachment.
   */
  queueApply: (apply: () => Promise<void>) => Promise<void>;
  /** Whether an apply is queued or the dashboard is still settling after one. */
  isApplying: () => boolean;
  /** Emits when an apply finished, so the dashboard can be compared with the conversation again. */
  applyFinished$: Observable<void>;
  /** Conversation attachment versions the dashboard shows, as keys from `toShownVersionKey`. */
  shownVersions$: BehaviorSubject<ReadonlySet<string>>;
  /** Updates `shownVersions$` when the shown versions changed; no argument clears them. */
  setShownVersions: (shownVersions?: ReadonlySet<string>) => void;
}

export const toShownVersionKey = (attachmentId: string, version: number): string =>
  `${attachmentId}:${version}`;

export const createAppliedAttachmentsStore = (): AppliedAttachmentsStore => {
  const applyFinished$ = new Subject<void>();
  let pendingApplies = 0;
  let lastApply: Promise<void> = Promise.resolve();
  const shownVersions$ = new BehaviorSubject<ReadonlySet<string>>(new Set());
  // links per conversation id, where `undefined` is a new conversation
  const linkedAttachmentIds = new Map<string | undefined, WeakMap<DashboardApi, string>>();
  let activeConversationId: string | undefined;

  return {
    setActiveConversationId: (conversationId) => {
      // a new conversation gets its id once its first message is sent
      const newConversationLinks = linkedAttachmentIds.get(undefined);
      if (activeConversationId === undefined && conversationId !== undefined) {
        linkedAttachmentIds.delete(undefined);
        if (newConversationLinks && !linkedAttachmentIds.has(conversationId)) {
          linkedAttachmentIds.set(conversationId, newConversationLinks);
        }
      }
      activeConversationId = conversationId;
    },
    getLinkedAttachmentId: (api) => linkedAttachmentIds.get(activeConversationId)?.get(api),
    setLinkedAttachmentId: (api, attachmentId) => {
      const links = linkedAttachmentIds.get(activeConversationId) ?? new WeakMap();
      links.set(api, attachmentId);
      linkedAttachmentIds.set(activeConversationId, links);
    },
    isLinkedInOtherConversation: (api, draftAttachmentId) =>
      [...linkedAttachmentIds].some(([conversationId, links]) => {
        const linkedAttachmentId = links.get(api);
        return (
          conversationId !== activeConversationId &&
          linkedAttachmentId !== undefined &&
          linkedAttachmentId !== draftAttachmentId
        );
      }),
    queueApply: (apply) => {
      // an idle queue starts the apply right away, so the dashboard updates in the same tick
      const isIdle = pendingApplies++ === 0;
      const queuedApply = (isIdle ? apply() : lastApply.then(apply)).finally(() => {
        pendingApplies--;
        applyFinished$.next();
      });
      lastApply = queuedApply.catch(() => undefined);
      return queuedApply;
    },
    isApplying: () => pendingApplies > 0,
    applyFinished$: applyFinished$.asObservable(),
    shownVersions$,
    setShownVersions: (shownVersions = new Set()) => {
      if (!isEqual(shownVersions, shownVersions$.getValue())) {
        shownVersions$.next(shownVersions);
      }
    },
  };
};
