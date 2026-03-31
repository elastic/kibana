/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';

export const createOriginSyncSubscription = ({
  api,
  conversationId,
  attachmentId,
  attachmentOrigin,
  agentBuilder,
  onOriginUpdated,
}: {
  api: DashboardApi;
  conversationId: string;
  attachmentId: string;
  attachmentOrigin: string | undefined;
  agentBuilder: AgentBuilderPluginStart;
  onOriginUpdated?: (origin: string) => void;
}): Subscription => {
  let previousSavedObjectId = api.savedObjectId$.value;
  let currentOrigin = attachmentOrigin;

  return api.savedObjectId$.subscribe((currentSavedObjectId) => {
    // Only update origin if:
    // - there is a new id to update to
    // - the id differs from the current linked origin
    // - and we're still looking at the dashboard currently linked to the attachment
    const shouldUpdate =
      currentSavedObjectId &&
      currentSavedObjectId !== currentOrigin &&
      (!currentOrigin ||
        previousSavedObjectId === currentOrigin ||
        currentSavedObjectId === currentOrigin);

    if (shouldUpdate) {
      void agentBuilder.updateAttachmentOrigin(conversationId, attachmentId, currentSavedObjectId);
      onOriginUpdated?.(currentSavedObjectId);
      currentOrigin = currentSavedObjectId;
    }
    previousSavedObjectId = currentSavedObjectId;
  });
};
