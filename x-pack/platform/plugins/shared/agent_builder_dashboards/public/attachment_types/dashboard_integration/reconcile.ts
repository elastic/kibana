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
  /** Whether the agent's changes to the dashboard's attachment apply to the open dashboard. */
  linkable: boolean;
  /** The origin to stage the dashboard with: its saved id, `undefined` when unsaved or not linkable. */
  origin: string | undefined;
  /** The conversation's attachment the dashboard stands for, if any. */
  attachment: TAttachment | undefined;
}

/**
 * Links the open dashboard to the conversation attachment it stands for: the one whose origin is
 * the dashboard, which for an unsaved dashboard is one without an origin. A dashboard the agent's
 * changes can't be applied to, e.g. a managed one or one the user can't write, is never linked:
 * it is staged without an origin, as a new attachment every time.
 */
export const resolveDashboardAttachmentLink = <TAttachment extends { origin?: string }>({
  api,
  canWriteDashboards,
  attachments,
}: {
  api: DashboardApi;
  canWriteDashboards: boolean;
  attachments: readonly TAttachment[];
}): DashboardAttachmentLink<TAttachment> => {
  if (!canWriteDashboards || !canApplyAgentChangesInPlace(api)) {
    return { linkable: false, origin: undefined, attachment: undefined };
  }
  const origin = api.savedObjectId$.getValue();
  return {
    linkable: true,
    origin,
    attachment: attachments.find((attachment) => attachment.origin === origin),
  };
};

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
