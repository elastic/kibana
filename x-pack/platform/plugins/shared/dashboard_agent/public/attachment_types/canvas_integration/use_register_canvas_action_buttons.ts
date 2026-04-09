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

interface UseRegisterCanvasActionButtonsParams {
  dashboardApi: DashboardApi | undefined;
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: string) => Promise<unknown>;
  timeRange: { from: string; to: string };
  dashboardState: Pick<DashboardState, 'title' | 'description' | 'panels' | 'time_range'>;
  attachmentOrigin: string | undefined;
  isSidebar: boolean;
  closeCanvas: () => void;
  openSidebarConversation?: () => void;
  savedObjectStatus: SavedObjectStatus;
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
  isSidebar,
  savedObjectStatus,
}: UseRegisterCanvasActionButtonsParams) => {
  const timeRangeRef = useLatest(timeRange);
  const attachmentOriginRef = useLatest(attachmentOrigin);
  const dashboardStateRef = useLatest(dashboardState);
  const openSidebarConversationRef = useLatest(openSidebarConversation);
  const savedObjectStatusRef = useLatest(savedObjectStatus);

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
          const existingAttachmentOrigin =
            savedObjectStatusRef.current.status === 'resolved' &&
            savedObjectStatusRef.current.exists
              ? attachmentOriginRef.current
              : undefined;
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
        const existingAttachmentOrigin =
          savedObjectStatusRef.current.status === 'resolved' && savedObjectStatusRef.current.exists
            ? attachmentOriginRef.current
            : undefined;
        if (existingAttachmentOrigin) {
          await dashboardApi.runQuickSave();
          await updateOrigin(existingAttachmentOrigin);
          return;
        }
        const result = await dashboardApi.runInteractiveSave();
        if (result?.id) {
          await updateOrigin(result.id);
        }
      },
    });
    registerActionButtons(buttons);
  }, [
    dashboardApi,
    registerActionButtons,
    updateOrigin,
    closeCanvas,
    openSidebarConversationRef,
    timeRangeRef,
    attachmentOriginRef,
    dashboardStateRef,
    savedObjectStatusRef,
    isSidebar,
  ]);
};
