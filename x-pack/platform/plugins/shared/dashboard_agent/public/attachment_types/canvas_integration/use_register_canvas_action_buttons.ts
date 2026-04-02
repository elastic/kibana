/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import useLatest from 'react-use/lib/useLatest';

export type SavedObjectStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'resolved'; exists: boolean };

// TODO: this feels very iffy, but it fixes the following flow as in edit in Dashboard, maybe we should rethink the flow?
// 1. Open a canvas dshboard view and save the dashboard
// 2. Go to Dashboard listing page and remove the dashboard you’ve created
// 3. Open the Canvas again -> Edit in Dashboards
// 4. You’re taken to the new dashboard page, but the origin is still set on the id of the removed dashboard - that’s ok, you can still edit
// 5. Click on save in dashboard app — it will not work because we check on save if origin === previousId to not override other dashboard - this fixes it
const getValidAttachmentOrigin = async (
  origin: string | undefined,
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>,
  updateOrigin: (origin: string) => Promise<unknown>
) => {
  if (!origin) return undefined;
  const exists = await checkSavedDashboardExist(origin);
  if (!exists) {
    await updateOrigin('');
    return undefined;
  }
  return origin;
};

interface UseRegisterCanvasActionButtonsParams {
  dashboardApi: DashboardApi | undefined;
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: string) => Promise<unknown>;
  timeRange: { from: string; to: string };
  dashboardState: Pick<DashboardState, 'title' | 'description' | 'panels' | 'time_range'>;
  attachmentOrigin: string | undefined;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
  isSidebar: boolean;
  closeCanvas: () => void;
  openSidebarConversation?: () => void;
}

export const useRegisterCanvasActionButtons = ({
  dashboardApi,
  registerActionButtons,
  updateOrigin,
  closeCanvas,
  openSidebarConversation,
  timeRange,
  dashboardState,
  attachmentOrigin,
  checkSavedDashboardExist,
  isSidebar,
}: UseRegisterCanvasActionButtonsParams) => {
  const timeRangeRef = useLatest(timeRange);
  const attachmentOriginRef = useLatest(attachmentOrigin);
  const dashboardStateRef = useLatest(dashboardState);
  const openSidebarConversationRef = useLatest(openSidebarConversation);

  useEffect(() => {
    if (!dashboardApi) {
      registerActionButtons([]);
      return;
    }

    const buttons: ActionButton[] = [];

    if (dashboardApi.locator) {
      const { locator } = dashboardApi;
      buttons.push({
        label: i18n.translate('xpack.dashboardAgent.attachments.dashboard.canvasEditActionLabel', {
          defaultMessage: 'Edit in Dashboards',
        }),
        type: ActionButtonType.PRIMARY,
        handler: async () => {
          const existingAttachmentOrigin = await getValidAttachmentOrigin(
            attachmentOriginRef.current,
            checkSavedDashboardExist,
            updateOrigin
          );
          await locator.navigate({
            ...dashboardStateRef.current,
            dashboardId: existingAttachmentOrigin,
            time_range: timeRangeRef.current,
            viewMode: 'edit',
          });
          closeCanvas();
          if (!isSidebar) {
            openSidebarConversationRef.current?.();
          }
        },
      });
    }
    buttons.push({
      label: i18n.translate('xpack.dashboardAgent.attachments.dashboard.canvasSaveActionLabel', {
        defaultMessage: 'Save',
      }),
      icon: 'save',
      type: ActionButtonType.PRIMARY,
      handler: async () => {
        const existingAttachmentOrigin = await getValidAttachmentOrigin(
          attachmentOriginRef.current,
          checkSavedDashboardExist,
          updateOrigin
        );
        if (existingAttachmentOrigin) {
          await dashboardApi.runQuickSave();
          await updateOrigin(existingAttachmentOrigin);
          return;
        }
        const result = await dashboardApi.runInteractiveSave();
        const nextSavedObjectId = result?.id ?? dashboardApi.savedObjectId$.value;
        if (nextSavedObjectId && nextSavedObjectId !== existingAttachmentOrigin) {
          await updateOrigin(nextSavedObjectId);
        }
      },
    });
    registerActionButtons(buttons);
  }, [
    dashboardApi,
    registerActionButtons,
    updateOrigin,
    checkSavedDashboardExist,
    closeCanvas,
    openSidebarConversationRef,
    timeRangeRef,
    attachmentOriginRef,
    dashboardStateRef,
    isSidebar,
  ]);
};
