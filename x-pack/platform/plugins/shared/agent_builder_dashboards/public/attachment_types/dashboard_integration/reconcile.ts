/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';

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
