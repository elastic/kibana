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

interface UseRegisterActionButtonsParams {
  dashboardApi: DashboardApi | undefined;
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: string) => Promise<unknown>;
  timeRange: { from: string; to: string };
  dashboardState: Pick<DashboardState, 'title' | 'description' | 'panels' | 'time_range'>;
  linkedSavedObjectId: string | undefined;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

export const useRegisterActionButtons = ({
  dashboardApi,
  registerActionButtons,
  updateOrigin,
  timeRange,
  dashboardState,
  linkedSavedObjectId,
  checkSavedDashboardExist,
}: UseRegisterActionButtonsParams) => {
  const timeRangeRef = useLatest(timeRange);
  const linkedSavedObjectIdRef = useLatest(linkedSavedObjectId);
  const dashboardStateRef = useLatest(dashboardState);

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
          const existingDashboardId =
            linkedSavedObjectIdRef.current &&
            (await checkSavedDashboardExist(linkedSavedObjectIdRef.current))
              ? linkedSavedObjectIdRef.current
              : undefined;
          await locator.navigate({
            ...dashboardStateRef.current,
            dashboardId: existingDashboardId,
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
        const existingDashboardId =
          linkedSavedObjectIdRef.current &&
          (await checkSavedDashboardExist(linkedSavedObjectIdRef.current))
            ? linkedSavedObjectIdRef.current
            : undefined;
        if (existingDashboardId) {
          await dashboardApi.runQuickSave();
          return;
        }
        const result = await dashboardApi.runInteractiveSave();
        const nextSavedObjectId = result?.id ?? dashboardApi.savedObjectId$.value;
        if (nextSavedObjectId && nextSavedObjectId !== existingDashboardId) {
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
    timeRangeRef,
    linkedSavedObjectIdRef,
    dashboardStateRef,
  ]);
};
