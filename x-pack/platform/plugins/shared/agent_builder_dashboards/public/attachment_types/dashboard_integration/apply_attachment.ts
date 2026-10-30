/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
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
  getComparableAttachmentState,
  getComparableDashboardState,
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

/** The open dashboard read once, as attachment data and in the form it is compared with attachments. */
export interface DashboardSnapshot {
  data: DashboardAttachmentData;
  comparableState: DashboardState;
}

export const getDashboardAttachmentData = (api: DashboardApi): DashboardAttachmentData =>
  dashboardStateToAttachmentData(api.getSerializedState().attributes);

export const getDashboardSnapshot = (api: DashboardApi): DashboardSnapshot => {
  const { attributes: state } = api.getSerializedState();
  return {
    data: dashboardStateToAttachmentData(state),
    comparableState: getComparableDashboardState(state),
  };
};

const waitForPanelsToLoad = async (api: DashboardApi): Promise<void> => {
  const { panels, pinnedPanels } = api.layout$.getValue();
  const panelIds = [...Object.keys(panels), ...Object.keys(pinnedPanels)];
  const panelsLoaded = Promise.all(
    panelIds.map((id) => api.getChildApi(id).catch(() => undefined))
  );
  await firstValueFrom(race(from(panelsLoaded), timer(PANELS_LOAD_TIMEOUT_MS)));
};

/**
 * Whether the dashboard shows the attachment data, that is whether applying it would change
 * nothing under the dashboard's unsaved-changes comparators, which each panel provides.
 */
export const isAttachmentShownInDashboard = (
  api: DashboardApi,
  { comparableState }: DashboardSnapshot,
  data: DashboardAttachmentData
): boolean => isEmpty(api.diffStates(getComparableAttachmentState(data), comparableState));

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
 * Applies the attachment to the dashboard and waits for its panels to settle, so the state
 * changes the apply causes are not taken for manual changes. Skips applying when the dashboard
 * already shows it.
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
    store.setLinkedAttachmentId(api, attachment.id);
    if (isAttachmentShownInDashboard(api, getDashboardSnapshot(api), attachment.data)) {
      return;
    }

    await api.setState(toAppliedDashboardState(api, attachment.data), { changedBy: ['agent'] });
    await waitForPanelsToLoad(api);
    await firstValueFrom(timer(MANUAL_CHANGES_DEBOUNCE_MS));
  });
