/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, isPlainObject, omit, sortBy } from 'lodash';
import { firstValueFrom, from, race, timer } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common/types';
import {
  attachmentDataToDashboardState,
  dashboardStateToAttachmentData,
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

// an empty array means the same as a missing key, and the dashboard omits or adds them freely
const omitEmptyArrays = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(omitEmptyArrays);
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => !(Array.isArray(entry) && entry.length === 0))
      .map(([key, entry]) => [key, omitEmptyArrays(entry)])
  );
};

// the dashboard history sorts panels by id, so undo can bring them back in a different order
const sortPanelsById = <Panel extends { id?: string; panels?: unknown[] }>(
  panels: Panel[] = []
): Panel[] =>
  sortBy(panels, ({ id }) => id).map((panel) =>
    Array.isArray(panel.panels)
      ? { ...panel, panels: sortBy(panel.panels as Array<{ id?: string }>, ({ id }) => id) }
      : panel
  );

/**
 * Brings attachment data to the form the dashboard serializes it in: the converter round trip
 * fills in the Lens API defaults, and the dashboard drops the time range mode, defaults
 * ES|QL approximation and fills in the access control on save, which the agent never edits.
 */
const toComparableDashboardData = (data: DashboardAttachmentData): unknown => {
  const {
    esql_approximation = false,
    time_range,
    ...rest
  } = omit(dashboardStateToAttachmentData(attachmentDataToDashboardState(data)), 'access_control');
  return omitEmptyArrays({
    ...rest,
    panels: sortPanelsById(rest.panels),
    pinned_panels: sortPanelsById(rest.pinned_panels),
    esql_approximation,
    ...(time_range && { time_range: omit(time_range, 'mode') }),
  });
};

const isSameDashboardContent = (
  left: DashboardAttachmentData,
  right: DashboardAttachmentData
): boolean => isEqual(toComparableDashboardData(left), toComparableDashboardData(right));

/**
 * Whether the dashboard still shows exactly what applying the attachment produced.
 */
export const isAttachmentAppliedToDashboard = ({
  store,
  api,
  attachment,
}: {
  store: AppliedAttachmentsStore;
  api: DashboardApi;
  attachment: DashboardAttachment;
}): boolean => {
  const dashboardData = getDashboardAttachmentData(api);
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
 * Applies the attachment to the dashboard and records how the dashboard represents it
 * once its panels settled. Skips applying when the dashboard already shows it.
 */
export const applyAttachmentToDashboard = async ({
  store,
  api,
  attachment,
}: {
  store: AppliedAttachmentsStore;
  api: DashboardApi;
  attachment: DashboardAttachment;
}): Promise<void> => {
  if (isAttachmentAppliedToDashboard({ store, api, attachment })) {
    return;
  }

  store.pendingApplies.add(attachment.id);
  try {
    await api.setState(attachmentDataToDashboardState(attachment.data), { changedBy: ['agent'] });
    await waitForPanelsToLoad(api);
    await firstValueFrom(timer(MANUAL_CHANGES_DEBOUNCE_MS));
    store.baselines.set(attachment.id, {
      attachmentData: attachment.data,
      dashboardData: getDashboardAttachmentData(api),
    });
  } finally {
    store.pendingApplies.delete(attachment.id);
  }
};
