/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceTime, merge, skip, type Subscription } from 'rxjs';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_ATTACHMENT_TYPE, dashboardStateToAttachment } from '@kbn/dashboard-agent-common';

export interface ManualChangesTrackerParams {
  api: DashboardApi;
  getAttachment: () => DashboardAttachment;
  addAttachment: (attachment: AttachmentInput) => void;
}

/**
 * Creates a subscription that tracks manual changes to the dashboard
 * and syncs them back to the attachment.
 *
 * Manual changes include:
 * - Layout changes (panel positions, sizes)
 * - Title and description changes
 * - Filter, query, and time range changes
 * - Dashboard settings changes (margins, sync options, etc.)
 *
 * Changes are debounced and only synced when:
 * - The dashboard is unsaved, OR
 * - The saved dashboard matches the attachment's origin
 */
export const createManualChangesTracker = ({
  api,
  getAttachment,
  addAttachment,
}: ManualChangesTrackerParams): Subscription => {
  // Collect observables for all trackable dashboard state
  const observables = [
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

  return merge(...observables)
    .pipe(
      skip(observables.length), // Skip initial emissions from all BehaviorSubjects
      debounceTime(150)
    )
    .subscribe(() => {
      const currentAttachment = getAttachment();
      const currentSavedObjectId = api.savedObjectId$.getValue();

      // Only sync if: no saved dashboard OR saved dashboard matches attachment's origin
      if (currentSavedObjectId && currentSavedObjectId !== currentAttachment.origin) {
        return;
      }

      const currentDashboardState = api.getSerializedState().attributes;
      if (!currentDashboardState) {
        return;
      }

      addAttachment({
        id: currentAttachment.id,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardStateToAttachment(currentDashboardState),
      });
    });
};
