/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';
import { createManualChangesSubscription } from './manual_changes_subscription';
import { createOriginSyncSubscription } from './origin_sync_subscription';

export interface DashboardAppIntegrationParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  getAttachment: () => DashboardAttachment;
  getSyncAttachment: (currentSavedObjectId: string | undefined) => DashboardAttachment | undefined;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  updateOrigin: (origin: string) => Promise<unknown>;
}

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
  getAttachment,
  getSyncAttachment,
  checkSavedDashboardExist,
  updateOrigin,
}: DashboardAppIntegrationParams): (() => void) => {
  const originSyncSubscription = createOriginSyncSubscription({
    api,
    getAttachment,
    getSyncAttachment,
    checkSavedDashboardExist,
    updateOrigin,
  });
  const agentLiveUpdatesSubscription = createAgentLiveUpdatesSubscription({
    agentBuilder,
    api,
  });
  const manualChangesSubscription = createManualChangesSubscription({
    agentBuilder,
    api,
    getAttachment,
    getSyncAttachment,
  });

  return () => {
    originSyncSubscription.unsubscribe();
    agentLiveUpdatesSubscription.unsubscribe();
    manualChangesSubscription.unsubscribe();
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
  // this stream is meant to be subscribed to for the side effect of registering the integration, it doesn't emit any values and completes when the integration is unregistered
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));
