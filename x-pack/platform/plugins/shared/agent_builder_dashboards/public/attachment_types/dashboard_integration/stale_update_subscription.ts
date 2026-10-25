/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';

/**
 * Applies the updated version of a stale attachment to the open dashboard when the user
 * stages it from the chat, if the attachment is linked to that dashboard.
 */
export const createStaleUpdateSubscription = ({
  api,
  staleUpdateStaged$,
  getAttachments,
}: {
  api: DashboardApi;
  staleUpdateStaged$: Observable<DashboardAttachment>;
  getAttachments: () => undefined | DashboardAttachment[];
}): Subscription =>
  staleUpdateStaged$.subscribe(({ id, data }) => {
    const linkedAttachment = getAttachments()?.find((attachment) => attachment.id === id);
    if (!linkedAttachment || linkedAttachment.origin !== api.savedObjectId$.getValue()) {
      return;
    }

    api.setState(attachmentDataToDashboardState(data));
  });
