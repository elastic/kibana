/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceTime, filter, map, merge, skip, type Observable } from 'rxjs';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_ATTACHMENT_TYPE, dashboardStateToAttachment } from '@kbn/dashboard-agent-common';
import { childrenUnsavedChanges$ } from '@kbn/presentation-publishing';

export interface ManualChangesTrackerParams {
  api: DashboardApi;
  getAttachment: () => DashboardAttachment | undefined;
  addAttachment: (attachment: AttachmentInput) => void;
}

type ManualChangesSourceParams = Omit<ManualChangesTrackerParams, 'addAttachment'>;

/**
 * Creates an observable that tracks manual changes to the dashboard
 * and syncs them back to the attachment.
 */
export const createManualChanges$ = ({
  api,
  getAttachment,
}: ManualChangesSourceParams): Observable<AttachmentInput> => {
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

  return merge(...observables, childrenChanges$).pipe(
    skip(observables.length), // Skip initial emissions from all BehaviorSubjects
    debounceTime(150),
    map((): AttachmentInput | undefined => {
      const currentAttachment = getAttachment();
      if (!currentAttachment) {
        return undefined;
      }

      const currentSavedObjectId = api.savedObjectId$.getValue();

      // Only sync if: no saved dashboard OR saved dashboard matches attachment's origin
      if (currentSavedObjectId && currentSavedObjectId !== currentAttachment.origin) {
        return undefined;
      }

      const currentDashboardState = api.getSerializedState().attributes;
      if (!currentDashboardState) {
        return undefined;
      }

      return {
        id: currentAttachment.id,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardStateToAttachment(currentDashboardState),
        origin: currentAttachment.origin,
      };
    }),
    filter((attachment): attachment is AttachmentInput => attachment !== undefined)
  );
};
