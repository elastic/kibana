/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';

export interface PersistDashboardAttachmentParams {
  attachments: AttachmentStateManager;
  previousAttachmentId: string | undefined;
  dashboardData: DashboardAttachmentData;
  description: string;
  /** When false, keep a hidden draft and do not publish a user-visible attachment. Default true. */
  persistAttachment: boolean;
}

export interface PersistDashboardAttachmentResult {
  attachmentId: string;
  version: number;
  persisted: boolean;
  /** Present when this call wrote a draft that should be used as dashboardAttachmentId next. */
  draftId?: string;
}

/**
 * Persists dashboard payload either as a hidden draft (for generate → fix
 * loops) or as the single user-visible attachment (finalize / one-shot).
 *
 * Drafts survive HITL because they are real attachments (hidden). On finalize, the draft
 * is collapsed into one visible version — intermediate draft versions are discarded.
 */
export const persistDashboardAttachment = async ({
  attachments,
  previousAttachmentId,
  dashboardData,
  description,
  persistAttachment,
}: PersistDashboardAttachmentParams): Promise<PersistDashboardAttachmentResult> => {
  const previous = previousAttachmentId
    ? attachments.getAttachmentRecord(previousAttachmentId)
    : undefined;
  const isHiddenDraft = previous?.hidden === true;
  const sourceAttachmentId = isHiddenDraft && previous?.group_id ? previous.group_id : undefined;

  if (!persistAttachment) {
    return saveDraft({
      attachments,
      previousAttachmentId,
      previousHidden: isHiddenDraft,
      sourceAttachmentId:
        sourceAttachmentId ?? (previous && !previous.hidden ? previousAttachmentId : undefined),
      dashboardData,
      description,
    });
  }

  return publishAttachment({
    attachments,
    previousAttachmentId,
    isHiddenDraft,
    sourceAttachmentId,
    dashboardData,
    description,
  });
};

const saveDraft = async ({
  attachments,
  previousAttachmentId,
  previousHidden,
  sourceAttachmentId,
  dashboardData,
  description,
}: {
  attachments: AttachmentStateManager;
  previousAttachmentId: string | undefined;
  previousHidden: boolean;
  sourceAttachmentId: string | undefined;
  dashboardData: DashboardAttachmentData;
  description: string;
}): Promise<PersistDashboardAttachmentResult> => {
  // Continue an existing hidden draft in place.
  if (previousAttachmentId && previousHidden) {
    const updated = await attachments.update(
      previousAttachmentId,
      { data: dashboardData, description, hidden: true },
      ATTACHMENT_REF_ACTOR.agent
    );
    if (!updated) {
      throw new Error(`Failed to update dashboard draft "${previousAttachmentId}".`);
    }
    return {
      attachmentId: previousAttachmentId,
      version: updated.current_version ?? 1,
      persisted: false,
      draftId: previousAttachmentId,
    };
  }

  // Editing a visible attachment: fork a hidden draft so the published attachment is
  // untouched until persistAttachment: true.
  const draftId = uuidv4();
  const groupId = sourceAttachmentId ?? previousAttachmentId;
  const created = await attachments.add(
    {
      id: draftId,
      type: DASHBOARD_ATTACHMENT_TYPE,
      description,
      data: dashboardData,
      hidden: true,
      ...(groupId ? { group_id: groupId } : {}),
    },
    ATTACHMENT_REF_ACTOR.agent
  );

  return {
    attachmentId: draftId,
    version: created.current_version ?? 1,
    persisted: false,
    draftId,
  };
};

const publishAttachment = async ({
  attachments,
  previousAttachmentId,
  isHiddenDraft,
  sourceAttachmentId,
  dashboardData,
  description,
}: {
  attachments: AttachmentStateManager;
  previousAttachmentId: string | undefined;
  isHiddenDraft: boolean;
  sourceAttachmentId: string | undefined;
  dashboardData: DashboardAttachmentData;
  description: string;
}): Promise<PersistDashboardAttachmentResult> => {
  // Finalize a hidden draft → one visible attachment (drop intermediate draft versions).
  if (previousAttachmentId && isHiddenDraft) {
    attachments.permanentDelete(previousAttachmentId);

    const targetId = sourceAttachmentId ?? previousAttachmentId;
    const existingTarget = attachments.getAttachmentRecord(targetId);

    if (existingTarget && sourceAttachmentId) {
      const updated = await attachments.update(
        targetId,
        { data: dashboardData, description, hidden: false },
        ATTACHMENT_REF_ACTOR.agent
      );
      if (!updated) {
        throw new Error(`Failed to publish dashboard attachment "${targetId}".`);
      }
      return {
        attachmentId: targetId,
        version: updated.current_version ?? 1,
        persisted: true,
      };
    }

    const created = await attachments.add(
      {
        id: targetId,
        type: DASHBOARD_ATTACHMENT_TYPE,
        description,
        data: dashboardData,
        hidden: false,
      },
      ATTACHMENT_REF_ACTOR.agent
    );
    return {
      attachmentId: targetId,
      version: created.current_version ?? 1,
      persisted: true,
    };
  }

  // One-shot create / direct update (no draft loop).
  const attachmentId = previousAttachmentId ?? uuidv4();
  const existing = attachments.getAttachmentRecord(attachmentId);
  const attachment = existing
    ? await attachments.update(
        attachmentId,
        { data: dashboardData, description },
        ATTACHMENT_REF_ACTOR.agent
      )
    : await attachments.add(
        {
          id: attachmentId,
          type: DASHBOARD_ATTACHMENT_TYPE,
          description,
          data: dashboardData,
        },
        ATTACHMENT_REF_ACTOR.agent
      );

  if (!attachment) {
    throw new Error(`Failed to persist dashboard attachment "${attachmentId}".`);
  }

  return {
    attachmentId,
    version: attachment.current_version ?? 1,
    persisted: true,
  };
};
