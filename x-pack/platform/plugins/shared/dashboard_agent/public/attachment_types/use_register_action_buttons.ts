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
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { i18n } from '@kbn/i18n';
import useLatest from 'react-use/lib/useLatest';
import type { DashboardCanvasInitialInput } from './dashboard_canvas_content';

interface UseRegisterActionButtonsParams {
  dashboardApi: DashboardApi | undefined;
  registerActionButtons: (buttons: ActionButton[]) => void;
  updateOrigin: (origin: DashboardAttachmentOrigin) => Promise<unknown>;
  timeRange: { from: string; to: string };
  initialDashboardInput: DashboardCanvasInitialInput;
  linkedSavedObjectId: string | undefined;
  doesSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

export const useRegisterActionButtons = ({
  dashboardApi,
  registerActionButtons,
  updateOrigin,
  timeRange,
  initialDashboardInput,
  linkedSavedObjectId,
  doesSavedDashboardExist,
}: UseRegisterActionButtonsParams) => {
  const timeRangeRef = useLatest(timeRange);
  const linkedSavedObjectIdRef = useLatest(linkedSavedObjectId);
  const initialDashboardInputRef = useLatest(initialDashboardInput);

  useEffect(() => {
    if (!dashboardApi) {
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
          const linkedId = linkedSavedObjectIdRef.current;
          const soExists = linkedId ? await doesSavedDashboardExist(linkedId) : false;
          const { title, description, panels } = initialDashboardInputRef.current;
          await locator.navigate({
            dashboardId: soExists ? linkedSavedObjectIdRef.current : undefined,
            title,
            description,
            panels,
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
        const result = await dashboardApi.runInteractiveSave();
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
    doesSavedDashboardExist,
    timeRangeRef,
    linkedSavedObjectIdRef,
    initialDashboardInputRef,
  ]);
};
