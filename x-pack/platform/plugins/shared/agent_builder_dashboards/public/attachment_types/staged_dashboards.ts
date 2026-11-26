/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { IdGenerator } from '.';

/**
 * Which open dashboard each dashboard attachment was staged from, shared by the dashboard app
 * integration and the "Add to chat" panel action so either knows what the other staged.
 */
export interface StagedDashboards {
  add: (attachmentId: string, api: DashboardApi) => void;
  /** Forgets the dashboard the attachment was staged from, e.g. once it opened in a new dashboard. */
  remove: (attachmentId: string) => void;
  isStagedFrom: (attachmentId: string, api: DashboardApi) => boolean;
  /** Whether the attachment was staged from a dashboard other than this one, e.g. for a panel pointer. */
  isStagedFromOtherDashboard: (attachmentId: string, api: DashboardApi) => boolean;
  /** Whether the attachment was staged from a saved dashboard, e.g. a copy of a managed one. */
  isStagedFromSavedDashboard: (attachmentId: string) => boolean;
  /** Records that a panel pointer staged in the chat input points at the attachment. */
  addPointerTarget: (attachmentId: string) => void;
  /**
   * The draft id to stage the dashboard under. Another dashboard staged under the current draft
   * keeps it only when a panel pointer points at it, so this one gets a new draft id; otherwise
   * this dashboard replaces it.
   */
  getDraftId: (draftAttachmentId: IdGenerator, api: DashboardApi) => string;
}

export const createStagedDashboards = (): StagedDashboards => {
  // a key per dashboard api, so the record doesn't keep closed dashboards alive
  const keyByApi = new WeakMap<DashboardApi, object>();
  const dashboardKeyByAttachmentId = new Map<string, object>();
  const stagedFromSavedDashboard = new Set<string>();
  const pointerTargets = new Set<string>();

  const getKey = (api: DashboardApi): object => {
    const existingKey = keyByApi.get(api);
    if (existingKey) {
      return existingKey;
    }
    const key = {};
    keyByApi.set(api, key);
    return key;
  };

  const isStagedFrom = (attachmentId: string, api: DashboardApi): boolean =>
    dashboardKeyByAttachmentId.get(attachmentId) === keyByApi.get(api);

  return {
    add: (attachmentId, api) => {
      dashboardKeyByAttachmentId.set(attachmentId, getKey(api));
      if (api.savedObjectId$.getValue()) {
        stagedFromSavedDashboard.add(attachmentId);
      } else {
        stagedFromSavedDashboard.delete(attachmentId);
      }
    },
    remove: (attachmentId) => {
      dashboardKeyByAttachmentId.delete(attachmentId);
    },
    isStagedFrom: (attachmentId, api) =>
      dashboardKeyByAttachmentId.has(attachmentId) && isStagedFrom(attachmentId, api),
    isStagedFromOtherDashboard: (attachmentId, api) =>
      dashboardKeyByAttachmentId.has(attachmentId) && !isStagedFrom(attachmentId, api),
    isStagedFromSavedDashboard: (attachmentId) => stagedFromSavedDashboard.has(attachmentId),
    addPointerTarget: (attachmentId) => {
      pointerTargets.add(attachmentId);
    },
    getDraftId: (draftAttachmentId, api) => {
      const { current } = draftAttachmentId;
      return pointerTargets.has(current) &&
        dashboardKeyByAttachmentId.has(current) &&
        !isStagedFrom(current, api)
        ? draftAttachmentId.next()
        : current;
    },
  };
};
