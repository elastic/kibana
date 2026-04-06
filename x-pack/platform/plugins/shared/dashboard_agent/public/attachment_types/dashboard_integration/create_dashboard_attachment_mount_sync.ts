/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ignoreElements, merge, Observable, tap, type Observable as RxObservable } from 'rxjs';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createManualChanges$ } from './manual_changes_tracker';
import { createOriginSyncSubscription } from './origin_sync_subscription';

export interface DashboardAttachmentMountSyncParams {
  api: DashboardApi;
  getAttachment: () => DashboardAttachment;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  updateOrigin: (origin: string) => Promise<unknown>;
  addAttachment: (attachment: AttachmentInput) => void;
}

export const createDashboardAttachmentMountSync$ = ({
  api,
  getAttachment,
  checkSavedDashboardExist,
  updateOrigin,
  addAttachment,
}: DashboardAttachmentMountSyncParams): RxObservable<never> => {
  const savedDashboardOriginSync$ = new Observable<never>(() =>
    createOriginSyncSubscription({
      api,
      attachmentOrigin: getAttachment().origin,
      checkSavedDashboardExist,
      onOriginChange: (origin) => {
        void updateOrigin(origin);
      },
    })
  );

  const manualChanges$ = createManualChanges$({
    api,
    getAttachment,
  }).pipe(
    tap((attachment) => {
      addAttachment(attachment);
    }),
    ignoreElements()
  );

  return merge(savedDashboardOriginSync$, manualChanges$);
};
