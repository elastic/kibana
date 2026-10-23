/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject, type Observable } from 'rxjs';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common/types';

export interface AppliedAttachmentBaseline {
  /** Attachment data that was applied to the dashboard. */
  attachmentData: DashboardAttachmentData;
  /** Dashboard state read back as attachment data once the applied panels settled. */
  dashboardData: DashboardAttachmentData;
}

/**
 * Tracks attachments applied to the dashboard app, so the dashboard runtime's own
 * normalization of an applied attachment (key order, panel defaults) is not mistaken
 * for a manual change.
 */
export interface AppliedAttachmentsStore {
  baselines: Map<string, AppliedAttachmentBaseline>;
  /**
   * Runs the apply once the previous ones settled, so a baseline is never read from a
   * dashboard that is still applying another attachment.
   */
  queueApply: (apply: () => Promise<void>) => Promise<void>;
  /** Whether an apply is queued or the dashboard is still settling after one. */
  isApplying: () => boolean;
  /** Emits when an apply finished, so the dashboard can be compared with the conversation again. */
  applyFinished$: Observable<void>;
  /** Conversation attachment versions the dashboard shows, as keys from `toShownVersionKey`. */
  shownVersions$: BehaviorSubject<ReadonlySet<string>>;
}

export const toShownVersionKey = (attachmentId: string, version: number): string =>
  `${attachmentId}:${version}`;

export const createAppliedAttachmentsStore = (): AppliedAttachmentsStore => {
  const applyFinished$ = new Subject<void>();
  let pendingApplies = 0;
  let lastApply: Promise<void> = Promise.resolve();

  return {
    baselines: new Map(),
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
    shownVersions$: new BehaviorSubject<ReadonlySet<string>>(new Set()),
  };
};
