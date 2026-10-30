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
  /** Attachment each open dashboard was applied from or staged as, so it stays linked before it has an origin. */
  linkedAttachmentIds: WeakMap<DashboardApi, string>;
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

  return {
    linkedAttachmentIds: new WeakMap(),
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
