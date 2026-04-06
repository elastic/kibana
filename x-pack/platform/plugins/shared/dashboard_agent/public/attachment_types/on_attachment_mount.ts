/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, merge, Observable, switchMap } from 'rxjs';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachmentLifecycleParams } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { createAgentLiveUpdatesSubscription } from './dashboard_integration/agent_live_updates_subscription';
import { createDashboardAttachmentMountSync$ } from './dashboard_integration/create_dashboard_attachment_mount_sync';

export interface OnAttachmentMountParams extends AttachmentLifecycleParams<DashboardAttachment> {
  agentBuilder: AgentBuilderPluginStart;
  dashboardPlugin: DashboardStart;
  addAttachment: (attachment: AttachmentInput) => void;
}

/**
 * Subscribes dashboard attachment sync when a dashboard app API is available
 * and cleans it up when the attachment unmounts.
 */
export const onAttachmentMount = ({
  agentBuilder,
  dashboardPlugin,
  getAttachment,
  updateOrigin,
  addAttachment,
}: OnAttachmentMountParams) => {
  const apiSubscription = dashboardPlugin.dashboardAppClientApi$
    .pipe(
      switchMap((api) =>
        api
          ? merge(
              createDashboardAttachmentMountSync$({
                api,
                getAttachment,
                updateOrigin,
                addAttachment,
              }),
              new Observable<never>(() => createAgentLiveUpdatesSubscription({ agentBuilder, api }))
            )
          : EMPTY
      )
    )
    .subscribe();

  return () => {
    apiSubscription.unsubscribe();
  };
};
