/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { firstValueFrom, from, race, timer } from 'rxjs';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common/types';
import {
  attachmentDataToDashboardState,
  dashboardStateToAttachmentData,
  isSameDashboardContent,
} from '@kbn/agent-builder-dashboards-common';
import {
  CHILDREN_UNSAVED_CHANGES_DEBOUNCE,
  UNSAVED_CHANGES_DEBOUNCE,
} from '@kbn/presentation-publishing';
import type { AppliedAttachmentsStore } from './applied_attachments_store';

/**
 * Layout manager refreshes `getSerializedState()` panel configs only after
 * `UNSAVED_CHANGES_DEBOUNCE` then `CHILDREN_UNSAVED_CHANGES_DEBOUNCE`. Wait that
 * long (+ buffer) so manual sync is not one edit behind.
 */
export const MANUAL_CHANGES_DEBOUNCE_MS =
  UNSAVED_CHANGES_DEBOUNCE + CHILDREN_UNSAVED_CHANGES_DEBOUNCE + 50;

const PANELS_LOAD_TIMEOUT_MS = 10000;

export const getDashboardAttachmentData = (api: DashboardApi): DashboardAttachmentData =>
  dashboardStateToAttachmentData(api.getSerializedState().attributes);

const waitForPanelsToLoad = async (api: DashboardApi): Promise<void> => {
  const { panels, pinnedPanels } = api.layout$.getValue();
  const panelIds = [...Object.keys(panels), ...Object.keys(pinnedPanels)];
  const panelsLoaded = Promise.all(
    panelIds.map((id) => api.getChildApi(id).catch(() => undefined))
  );
  await firstValueFrom(race(from(panelsLoaded), timer(PANELS_LOAD_TIMEOUT_MS)));
};

/**
 * Whether the dashboard data still shows exactly what applying the attachment produced.
 */
export const isAttachmentAppliedToDashboard = ({
  store,
  dashboardData,
  attachment,
}: {
  store: AppliedAttachmentsStore;
  dashboardData: DashboardAttachmentData;
  attachment: Pick<DashboardAttachment, 'id' | 'data'>;
}): boolean => {
  if (isSameDashboardContent(attachment.data, dashboardData)) {
    return true;
  }
  const baseline = store.baselines.get(attachment.id);
  return Boolean(
    baseline &&
      isEqual(baseline.attachmentData, attachment.data) &&
      isSameDashboardContent(baseline.dashboardData, dashboardData)
  );
};

/**
 * An attachment without a refresh interval pauses the dashboard's own one. Keeping its value,
 * which the timefilter already accepted, avoids a default below the minimum refresh interval
 * that the timefilter would clamp and report as an unsaved change.
 */
const toAppliedDashboardState = (
  api: DashboardApi,
  data: DashboardAttachmentData
): DashboardState => {
  const dashboardState = attachmentDataToDashboardState(data);
  const { refresh_interval: currentRefreshInterval } = api.getSerializedState().attributes;
  if (dashboardState.refresh_interval || !currentRefreshInterval) {
    return dashboardState;
  }
  return { ...dashboardState, refresh_interval: { ...currentRefreshInterval, pause: true } };
};

/**
 * Applies the attachment to the dashboard and records how the dashboard represents it
 * once its panels settled. Skips applying when the dashboard already shows it.
 */
export const applyAttachmentToDashboard = ({
  store,
  api,
  attachment,
}: {
  store: AppliedAttachmentsStore;
  api: DashboardApi;
  attachment: DashboardAttachment;
}): Promise<void> =>
  store.queueApply(async () => {
    store.linkedAttachmentIds.set(api, attachment.id);
    if (
      isAttachmentAppliedToDashboard({
        store,
        dashboardData: getDashboardAttachmentData(api),
        attachment,
      })
    ) {
      return;
    }

    await api.setState(toAppliedDashboardState(api, attachment.data), { changedBy: ['agent'] });
    await waitForPanelsToLoad(api);
    await firstValueFrom(timer(MANUAL_CHANGES_DEBOUNCE_MS));
    store.baselines.set(attachment.id, {
      attachmentData: attachment.data,
      dashboardData: getDashboardAttachmentData(api),
    });
  });
