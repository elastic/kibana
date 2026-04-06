/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, Observable } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createManualChangesSubscription } from './manual_changes_subscription';
import { createOriginSyncSubscription } from './origin_sync_subscription';

export interface DashboardAppIntegrationParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  getAttachment: () => DashboardAttachment;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  updateOrigin: (origin: string) => Promise<unknown>;
}

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
  getAttachment,
  checkSavedDashboardExist,
  updateOrigin,
}: DashboardAppIntegrationParams): (() => void) => {
  const subscription = merge(
    new Observable<never>(() =>
      createOriginSyncSubscription({
        api,
        attachmentOrigin: getAttachment().origin,
        checkSavedDashboardExist,
        onOriginChange: (origin) => {
          void updateOrigin(origin);
        },
      })
    ),
    new Observable<never>(() =>
      createManualChangesSubscription({
        agentBuilder,
        api,
        getAttachment,
      })
    )
  ).subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));
