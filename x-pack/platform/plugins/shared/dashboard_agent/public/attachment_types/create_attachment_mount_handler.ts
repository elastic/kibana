/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import { pairwise, startWith } from 'rxjs';
import type { AttachmentLifecycleParams } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';

interface CreateAttachmentMountHandlerParams {
  dashboardPlugin: DashboardStart;
  updateAttachmentOrigin: (
    conversationId: string,
    attachmentId: string,
    origin: string
  ) => Promise<void>;
}

/**
 * Creates the onAttachmentMount handler for dashboard attachments.
 * This handler manages:
 * - Origin sync: Links attachment to saved dashboard when dashboard is saved
 * - (Future) Manual changes sync
 * - (Future) Live changes sync from chat via agentBuilder.chat$
 */
export const createAttachmentMountHandler = ({
  dashboardPlugin,
  updateAttachmentOrigin,
}: CreateAttachmentMountHandlerParams) => {
  return ({
    attachment,
    conversationId,
  }: AttachmentLifecycleParams<DashboardAttachment>): (() => void) => {
    let savedObjectIdSubscription: Subscription | undefined;

    // Subscribe to dashboard API changes to manage savedObjectId$ subscription lifecycle
    const apiSubscription = dashboardPlugin.dashboardAppClientApi$.subscribe((api) => {
      savedObjectIdSubscription?.unsubscribe();
      savedObjectIdSubscription = undefined;

      if (!api) return;

      savedObjectIdSubscription = api.savedObjectId$
        .pipe(startWith<string | undefined>(attachment.origin), pairwise())
        .subscribe(([previousId, currentId]) => {
          // Only update origin if:
          // 1. The attachment has no origin (unsaved), OR
          // 2. The previous savedObjectId matches the attachment origin (we're on the same dashboard)
          // This prevents linking to unrelated dashboards when navigating
          const shouldUpdateOrigin = !attachment.origin || previousId === attachment.origin;

          if (currentId && currentId !== attachment.origin && shouldUpdateOrigin) {
            updateAttachmentOrigin(conversationId, attachment.id, currentId);
          }
        });
    });

    return () => {
      apiSubscription.unsubscribe();
      savedObjectIdSubscription?.unsubscribe();
    };
  };
};
