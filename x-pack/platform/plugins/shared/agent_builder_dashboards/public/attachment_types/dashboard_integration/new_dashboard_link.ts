/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';

export interface NewDashboardLink {
  /**
   * Links the next dashboard that opens after `fromApi` to the attachment whose changes it shows.
   * Returns a function that removes the link when no dashboard has taken it over yet.
   */
  linkNextDashboard: (fromApi: DashboardApi, attachmentId: string) => () => void;
  /** Takes over the link `linkNextDashboard` left, when the dashboard is a new, unsaved one. */
  claim: (api: DashboardApi) => void;
  getLinkedAttachmentId: (api: DashboardApi) => string | undefined;
}

/**
 * Keeps an attachment whose changes opened in a new dashboard linked to that dashboard, so saving
 * it moves the attachment's origin there, away from the dashboard the user couldn't edit.
 */
export const createNewDashboardLink = (): NewDashboardLink => {
  let nextLink: { fromApi: DashboardApi; attachmentId: string } | undefined;
  const linkedAttachmentIds = new WeakMap<DashboardApi, string>();

  return {
    linkNextDashboard: (fromApi, attachmentId) => {
      const link = { fromApi, attachmentId };
      nextLink = link;
      return () => {
        if (nextLink === link) {
          nextLink = undefined;
        }
      };
    },
    claim: (api) => {
      // the dashboard the changes were opened from is published again when the chat reopens
      if (!nextLink || nextLink.fromApi === api) {
        return;
      }
      if (!api.savedObjectId$.getValue()) {
        linkedAttachmentIds.set(api, nextLink.attachmentId);
      }
      nextLink = undefined;
    },
    getLinkedAttachmentId: (api) => linkedAttachmentIds.get(api),
  };
};
