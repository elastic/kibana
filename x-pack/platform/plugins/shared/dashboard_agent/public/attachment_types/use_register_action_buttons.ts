/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachmentOrigin } from '@kbn/dashboard-agent-common';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import useLatest from 'react-use/lib/useLatest';

interface UseRegisterActionButtonsParams {
  dashboardApi: DashboardApi | undefined;
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: DashboardAttachmentOrigin) => Promise<unknown>;
  timeRange: { from: string; to: string };
  dashboardState: Pick<DashboardState, 'title' | 'description' | 'panels' | 'time_range'>;
  linkedSavedObjectId: string | undefined;
  linkedSavedDashboardExists: boolean;
  isLinkedSavedDashboardExistsLoading: boolean;
}

export const useRegisterActionButtons = ({
  dashboardApi,
  registerActionButtons,
  updateOrigin,
  timeRange,
  dashboardState,
  linkedSavedObjectId,
  linkedSavedDashboardExists,
  isLinkedSavedDashboardExistsLoading,
}: UseRegisterActionButtonsParams) => {
  const timeRangeRef = useLatest(timeRange);
  const linkedSavedObjectIdRef = useLatest(linkedSavedObjectId);
  const linkedSavedDashboardExistsRef = useLatest(linkedSavedDashboardExists);
  const dashboardStateRef = useLatest(dashboardState);

  useEffect(() => {
    if (!dashboardApi || isLinkedSavedDashboardExistsLoading) {
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
          await locator.navigate({
            ...dashboardStateRef.current,
            dashboardId: linkedSavedDashboardExistsRef.current
              ? linkedSavedObjectIdRef.current
              : undefined,
            time_range: timeRangeRef.current,
            viewMode: 'edit',
          });
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
        if (linkedSavedDashboardExistsRef.current) {
          await dashboardApi.runQuickSave({ showOpenLink: true });
          return;
        }
        const result = await dashboardApi.runInteractiveSave({ showOpenLink: true });
        const nextSavedObjectId = result?.id ?? dashboardApi.savedObjectId$.value;
        if (nextSavedObjectId && nextSavedObjectId !== linkedSavedObjectIdRef.current) {
          await updateOrigin({ savedObjectId: nextSavedObjectId });
        }
      },
    });
    registerActionButtons(buttons);
  }, [
    dashboardApi,
    registerActionButtons,
    updateOrigin,
    isLinkedSavedDashboardExistsLoading,
    timeRangeRef,
    linkedSavedObjectIdRef,
    linkedSavedDashboardExistsRef,
    dashboardStateRef,
  ]);
};
