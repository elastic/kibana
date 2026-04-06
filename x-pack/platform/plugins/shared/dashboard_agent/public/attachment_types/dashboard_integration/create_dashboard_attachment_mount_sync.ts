/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, Observable, type Observable as RxObservable } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createManualChangesSubscription } from './manual_changes_subscription';
import { createOriginSyncSubscription } from './origin_sync_subscription';

export interface DashboardAttachmentMountSyncParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  getAttachment: () => DashboardAttachment;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  updateOrigin: (origin: string) => Promise<unknown>;
}

export const createDashboardAttachmentMountSync$ = ({
  agentBuilder,
  api,
  getAttachment,
  checkSavedDashboardExist,
  updateOrigin,
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

  const manualChanges$ = new Observable<never>(() =>
    createManualChangesSubscription({
      agentBuilder,
      api,
      getAttachment,
    })
  );

  return merge(savedDashboardOriginSync$, manualChanges$);
};
