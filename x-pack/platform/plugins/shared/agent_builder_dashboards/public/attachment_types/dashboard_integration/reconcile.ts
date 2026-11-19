/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common/types';
import {
  getComparableAttachmentState,
  getComparableDashboardState,
} from '@kbn/agent-builder-dashboards-common';

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

/**
 * The attachment the open dashboard stands for: the one whose origin is the dashboard, which for an
 * unsaved dashboard is one without an origin.
 */
export const findDashboardAttachment = ({
  attachments,
  dashboardId,
}: {
  attachments: DashboardAttachment[];
  /** The saved id of the dashboard, `undefined` for an unsaved one. */
  dashboardId: string | undefined;
}): DashboardAttachment | undefined => attachments.find(({ origin }) => origin === dashboardId);

/**
 * The id the chat input stages the open dashboard under: its attachment, or a new attachment when
 * the conversation is new. `undefined` leaves the chat input as it is.
 */
export const reconcileStaging = ({
  dashboardAttachmentId,
  isNewConversation,
  draftAttachmentId,
}: {
  dashboardAttachmentId: string | undefined;
  isNewConversation: boolean;
  draftAttachmentId: string;
}): string | undefined =>
  dashboardAttachmentId ?? (isNewConversation ? draftAttachmentId : undefined);

/**
 * Whether an agent update belongs to the open dashboard: an unsaved dashboard takes every update,
 * a saved one those of its attachment, or of one it staged without an origin because it can't be
 * edited.
 */
export const isOpenDashboardUpdate = ({
  attachment: { id, origin },
  dashboardId,
  isStagedFromDashboard,
}: {
  attachment: DashboardAttachment;
  dashboardId: string | undefined;
  isStagedFromDashboard: (attachmentId: string) => boolean;
}): boolean => !dashboardId || origin === dashboardId || (!origin && isStagedFromDashboard(id));
