/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common/types';
import {
  getComparableAttachmentState,
  getComparableDashboardState,
} from '@kbn/agent-builder-dashboards-common';
import { canApplyAgentChangesInPlace } from './show_attachment';

/** Compares two dashboard states with the comparators each panel's embeddable definition provides. */
export type AreDashboardStatesEqual = DashboardStart['areEqual'];

/**
 * Whether the dashboard shows the attachment data, that is whether applying it would change
 * nothing under the comparators each panel's embeddable definition provides.
 */
export const isAttachmentShownInDashboard = async ({
  areEqual,
  dashboardState,
  data,
}: {
  areEqual: AreDashboardStatesEqual;
  dashboardState: DashboardState;
  data: DashboardAttachmentData;
}): Promise<boolean> => {
  const comparableState = getComparableDashboardState(dashboardState);
  const attachmentState = getComparableAttachmentState(data);
  const { refresh_interval: refreshInterval } = comparableState;
  // applying an attachment without a refresh interval keeps the dashboard's own
  const baseline =
    attachmentState.refresh_interval || !refreshInterval
      ? attachmentState
      : { ...attachmentState, refresh_interval: refreshInterval };
  // a failed comparison can't establish that the dashboard shows the attachment
  return areEqual(baseline, comparableState).catch(() => false);
};

export interface DashboardAttachmentLink<TAttachment> {
  /** Whether agent changes apply to the open dashboard. */
  linkable: boolean;
  /** The saved id to stage with; `undefined` when unsaved or not linkable. */
  origin: string | undefined;
  attachment: TAttachment | undefined;
}

/**
 * Finds the attachment whose origin is the open dashboard (none for an unsaved one). Dashboards the
 * agent can't change in place, e.g. managed ones, are never linked. An unsaved dashboard never links
 * to a copy staged from a saved dashboard, since that copy has no origin either.
 */
export const resolveDashboardAttachmentLink = <
  TAttachment extends { id: string; origin?: string }
>({
  api,
  canWriteDashboards,
  attachments,
  isStagedFromSavedDashboard,
}: {
  api: DashboardApi;
  canWriteDashboards: boolean;
  attachments: readonly TAttachment[];
  isStagedFromSavedDashboard: (attachmentId: string) => boolean;
}): DashboardAttachmentLink<TAttachment> => {
  if (!canWriteDashboards || !canApplyAgentChangesInPlace(api)) {
    return { linkable: false, origin: undefined, attachment: undefined };
  }
  const origin = api.savedObjectId$.getValue();
  return {
    linkable: true,
    origin,
    attachment: attachments.find(
      ({ id, origin: attachmentOrigin }) =>
        attachmentOrigin === origin && (origin !== undefined || !isStagedFromSavedDashboard(id))
    ),
  };
};

/**
 * The id the chat input stages the open dashboard under: its attachment, or a new attachment when
 * the conversation is new or the open dashboard is already staged under the draft id, e.g. by "Add
 * to chat". `undefined` leaves the chat input as it is.
 */
export const reconcileStaging = ({
  dashboardAttachmentId,
  isNewConversation,
  isDraftStagedFromDashboard,
  draftAttachmentId,
}: {
  dashboardAttachmentId: string | undefined;
  isNewConversation: boolean;
  isDraftStagedFromDashboard: boolean;
  draftAttachmentId: string;
}): string | undefined =>
  dashboardAttachmentId ??
  (isNewConversation || isDraftStagedFromDashboard ? draftAttachmentId : undefined);

/**
 * Whether an agent update belongs to the open dashboard: a saved one takes those of its attachment,
 * or of one it staged without an origin because it can't be edited. An unsaved one takes every
 * update without an origin, except those of another dashboard staged for a panel pointer, so
 * editing a pointed panel never replaces the unsaved dashboard.
 */
export const isOpenDashboardUpdate = ({
  attachment: { id, origin },
  dashboardId,
  isStagedFromDashboard,
  isStagedFromOtherDashboard,
}: {
  attachment: DashboardAttachment;
  dashboardId: string | undefined;
  isStagedFromDashboard: (attachmentId: string) => boolean;
  isStagedFromOtherDashboard: (attachmentId: string) => boolean;
}): boolean => {
  if (!dashboardId) {
    return !origin && !isStagedFromOtherDashboard(id);
  }
  return origin === dashboardId || (!origin && isStagedFromDashboard(id));
};
