/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { AttachmentLifecycleParams } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';

interface CreateAttachmentMountHandlerParams {
  dashboardPlugin: DashboardStart;
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
}: CreateAttachmentMountHandlerParams) => {
  return ({
    getAttachment,
    updateOrigin,
  }: AttachmentLifecycleParams<DashboardAttachment>): (() => void) => {
    let savedObjectIdSubscription: Subscription | undefined;

    // Subscribe to dashboard API changes to manage savedObjectId$ subscription lifecycle
    const apiSubscription = dashboardPlugin.dashboardAppClientApi$.subscribe((api) => {
      savedObjectIdSubscription?.unsubscribe();
      savedObjectIdSubscription = undefined;

      if (!api) return;

      let previousSavedObjectId = api.savedObjectId$.value;

      savedObjectIdSubscription = api.savedObjectId$.subscribe(async (currentSavedObjectId) => {
        const currentAttachment = getAttachment();
        // Only update origin if:
        // there is an id to update to (currentId is not undefined)
        // the id is different from the current origin (currentId !== currentAttachment.origin)
        // 1. The attachment has no origin yet (unsaved), OR
        // 2. The previous savedObjectId matches the attachment origin (we're on the same dashboard)
        // This prevents linking to unrelated dashboards when navigating

        const shouldUpdate =
          currentSavedObjectId &&
          currentSavedObjectId !== currentAttachment.origin &&
          (!currentAttachment.origin || previousSavedObjectId === currentAttachment.origin);
        if (shouldUpdate) {
          await updateOrigin(currentSavedObjectId);
        }
        previousSavedObjectId = currentSavedObjectId;
      });
    });

    return () => {
      apiSubscription.unsubscribe();
      savedObjectIdSubscription?.unsubscribe();
    };
  };
};
