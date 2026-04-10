/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  debounceTime,
  filter,
  ignoreElements,
  map,
  merge,
  skip,
  tap,
  type Observable,
  type Subscription,
} from 'rxjs';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
} from '@kbn/dashboard-agent-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { childrenUnsavedChanges$ } from '@kbn/presentation-publishing';

export interface ManualChangesSubscriptionParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  getAttachment: () => DashboardAttachment | undefined;
  getSyncAttachment: (currentSavedObjectId: string | undefined) => DashboardAttachment | undefined;
}

/**
 * Creates a subscription that tracks manual changes to the dashboard
 * and syncs them back to the attachment.
 */
export const createManualChangesSubscription = ({
  agentBuilder,
  api,
  getAttachment,
  getSyncAttachment,
}: ManualChangesSubscriptionParams): Subscription => {
  // TODO: we should get it directly from the dashboard plugin
  // Collect observables for all trackable dashboard state
  const observables: Array<Observable<unknown>> = [
    api.layout$,
    api.title$,
    api.description$,
    api.filters$,
    api.query$,
    api.timeRange$,
    api.projectRouting$,
    api.settings?.autoApplyFilters$,
    api.settings?.syncColors$,
    api.settings?.syncCursor$,
    api.settings?.syncTooltips$,
    api.settings?.useMargins$,
    api.hideTitle$,
    api.hideBorder$,
  ].filter((o): o is NonNullable<typeof o> => Boolean(o));
  const childrenChanges$ = childrenUnsavedChanges$(api.children$).pipe(skip(1));

  return merge(...observables, childrenChanges$)
    .pipe(
      skip(observables.length), // Skip initial emissions from all BehaviorSubjects
      debounceTime(150),
      map((): AttachmentInput | undefined => {
        const currentAttachment = getAttachment();
        if (!currentAttachment) {
          return undefined;
        }

        const currentSavedObjectId = api.savedObjectId$.getValue();
        const syncAttachment = getSyncAttachment(currentSavedObjectId);

        // Only the attachment selected for the current dashboard should own sync.
        if (!syncAttachment || syncAttachment.id !== currentAttachment.id) {
          return undefined;
        }
        const currentDashboardState = api.getSerializedState().attributes;
        if (!currentDashboardState) {
          return undefined;
        }

        const data = dashboardStateToAttachmentData(currentDashboardState);
        if (!data) {
          return undefined;
        }

        return {
          data,
          id: currentAttachment.id,
          origin: currentAttachment.origin,
          type: DASHBOARD_ATTACHMENT_TYPE,
        };
      }),
      filter((attachment): attachment is AttachmentInput => attachment !== undefined),
      tap((attachment) => {
        agentBuilder.addAttachment(attachment);
      }),
      ignoreElements()
    )
    .subscribe();
};
