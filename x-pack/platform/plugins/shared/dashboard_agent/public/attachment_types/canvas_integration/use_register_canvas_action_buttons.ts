/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import useLatest from 'react-use/lib/useLatest';
import { handleEditInDashboard } from '../handle_edit_in_dashboard';

export type SavedObjectStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'resolved'; exists: boolean };

interface UseRegisterCanvasActionButtonsParams {
  dashboardApi: DashboardApi | undefined;
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: string) => Promise<unknown>;
  dashboardLocatorParams: DashboardLocatorParams;
  getExistingDashboardId: () => string | undefined;
  closeCanvas: () => void;
  openSidebarConversation?: () => void;
  canWriteDashboards: boolean;
}

export const useRegisterCanvasActionButtons = ({
  dashboardApi,
  registerActionButtons,
  updateOrigin,
  closeCanvas,
  openSidebarConversation,
  canWriteDashboards,
  dashboardLocatorParams,
  getExistingDashboardId,
}: UseRegisterCanvasActionButtonsParams) => {
  const dashboardLocatorParamsRef = useLatest(dashboardLocatorParams);
  const getExistingDashboardIdRef = useLatest(getExistingDashboardId);
  const openSidebarConversationRef = useLatest(openSidebarConversation);

  const missingDashboardWriteControlsReason = i18n.translate(
    'xpack.dashboardAgent.attachments.dashboard.canvasWriteControlsDisabledReason',
    {
      defaultMessage: 'You need dashboard write permissions to edit or save dashboards.',
    }
  );
  const managedDashboardDisabledReason = i18n.translate(
    'xpack.dashboardAgent.attachments.dashboard.canvasManagedDashboardDisabledReason',
    {
      defaultMessage: 'Managed dashboards are read-only.',
    }
  );
  const readOnlyDashboardDisabledReason = i18n.translate(
    'xpack.dashboardAgent.attachments.dashboard.canvasReadOnlyDashboardDisabledReason',
    {
      defaultMessage: 'You do not have permission to edit this dashboard.',
    }
  );

  useEffect(() => {
    if (!dashboardApi) {
      registerActionButtons([]);
      return;
    }

    const isLinkedSavedDashboard = getExistingDashboardIdRef.current?.() !== undefined;
    const isManagedLinkedDashboard = isLinkedSavedDashboard && dashboardApi.isManaged;
    const isReadOnlyLinkedDashboard = isLinkedSavedDashboard && !dashboardApi.isEditableByUser;

    let disabledReason: string | undefined;
    if (!canWriteDashboards) {
      disabledReason = missingDashboardWriteControlsReason;
    } else if (isManagedLinkedDashboard) {
      disabledReason = managedDashboardDisabledReason;
    } else if (isReadOnlyLinkedDashboard) {
      disabledReason = readOnlyDashboardDisabledReason;
    }

    const isWriteActionDisabled = disabledReason !== undefined;

    const buttons: ActionButton[] = [];

    if (dashboardApi.locator) {
      const { locator } = dashboardApi;
      buttons.push({
        label: i18n.translate('xpack.dashboardAgent.attachments.dashboard.canvasEditActionLabel', {
          defaultMessage: 'Edit in Dashboards',
        }),
        type: ActionButtonType.PRIMARY,
        disabled: isWriteActionDisabled,
        disabledReason,
        handler: async () => {
          if (isWriteActionDisabled) {
            return;
          }
          await handleEditInDashboard({
            locator,
            getExistingDashboardId: async () => getExistingDashboardIdRef.current(),
            dashboardLocatorParams: dashboardLocatorParamsRef.current,
          });
          closeCanvas();
          openSidebarConversationRef.current?.();
        },
      });
    }
    buttons.push({
      label: i18n.translate('xpack.dashboardAgent.attachments.dashboard.canvasSaveActionLabel', {
        defaultMessage: 'Save',
      }),
      icon: 'save',
      type: ActionButtonType.PRIMARY,
      disabled: isWriteActionDisabled,
      disabledReason,
      handler: async () => {
        if (isWriteActionDisabled) {
          return;
        }
        const existingAttachmentOrigin = getExistingDashboardIdRef.current();
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
    dashboardLocatorParamsRef,
    getExistingDashboardIdRef,
    canWriteDashboards,
    missingDashboardWriteControlsReason,
    managedDashboardDisabledReason,
    readOnlyDashboardDisabledReason,
  ]);
};
