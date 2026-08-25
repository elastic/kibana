/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveConversation, AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachmentData,
  isDashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi, DashboardStart } from '@kbn/dashboard-plugin/public';
import type { FilesStart } from '@kbn/files-plugin/public';
import { captureAppMainScreenshot } from './capture_app_main_screenshot';
import { PRETTIFY_DASHBOARD_PROMPT } from './canvas_integration/use_register_canvas_action_buttons';
import { uploadChatImage } from './upload_chat_image';
import type { IdGenerator } from '.';

const screenshotAttachment = async (files: FilesStart): Promise<AttachmentInput | undefined> => {
  const image = await captureAppMainScreenshot();
  if (!image) {
    return undefined;
  }
  const data = await uploadChatImage({
    files,
    blob: image.blob,
    name: image.name,
    mimeType: image.mimeType,
  });
  return {
    type: AttachmentType.image,
    description: 'Dashboard screenshot',
    data,
  };
};

const getActiveConversation = (
  agentBuilder: AgentBuilderPluginStart
): ActiveConversation | null => {
  let active: ActiveConversation | null = null;
  agentBuilder.events.ui.activeConversation$
    .subscribe((value) => {
      active = value;
    })
    .unsubscribe();
  return active;
};

const findExistingDashboardAttachmentId = ({
  agentBuilder,
  dashboardId,
}: {
  agentBuilder: AgentBuilderPluginStart;
  dashboardId: string | undefined;
}): string | undefined => {
  const attachments = getActiveConversation(agentBuilder)?.conversation?.attachments;
  if (!attachments?.length) {
    return undefined;
  }

  for (const attachment of attachments) {
    if (!isDashboardAttachment(attachment) || !getLatestVersion(attachment)) {
      continue;
    }
    // Match by origin when the dashboard is saved; for unsaved drafts any dashboard attachment counts.
    if (dashboardId) {
      if (attachment.origin === dashboardId) {
        return attachment.id;
      }
    } else {
      return attachment.id;
    }
  }
  return undefined;
};

const buildCurrentDashboardAttachment = ({
  agentBuilder,
  dashboardApi,
  draftAttachmentId,
}: {
  agentBuilder: AgentBuilderPluginStart;
  dashboardApi: DashboardApi | undefined;
  draftAttachmentId: IdGenerator;
}): AttachmentInput | undefined => {
  if (!dashboardApi) {
    return undefined;
  }

  const dashboardId = dashboardApi.savedObjectId$.getValue();
  const existingId = findExistingDashboardAttachmentId({ agentBuilder, dashboardId });
  if (existingId) {
    // Already attached to the active conversation — do not add another.
    return undefined;
  }

  return {
    id: draftAttachmentId.current,
    origin: dashboardId,
    type: DASHBOARD_ATTACHMENT_TYPE,
    data: dashboardStateToAttachmentData(dashboardApi.getSerializedState().attributes),
  };
};

/**
 * Opens the dashboard agent chat with an optional viewport screenshot and sends the Prettify prompt.
 * Also attaches the current dashboard when it is not already present in the active conversation.
 */
export const submitPrettifyWithScreenshot = async ({
  agentBuilder,
  dashboard,
  draftAttachmentId,
  files,
}: {
  agentBuilder: AgentBuilderPluginStart;
  dashboard: DashboardStart;
  draftAttachmentId: IdGenerator;
  files: FilesStart;
}): Promise<void> => {
  const screenshot = await screenshotAttachment(files);
  const dashboardAttachment = buildCurrentDashboardAttachment({
    agentBuilder,
    dashboardApi: dashboard.dashboardAppClientApi$.getValue(),
    draftAttachmentId,
  });

  const attachments = [
    ...(dashboardAttachment ? [dashboardAttachment] : []),
    ...(screenshot ? [screenshot] : []),
  ];

  // Fresh sidebar: attachments come from openChat initial props.
  // Already-open sidebar: also upsert via addAttachment (updateProps is a full replace).
  agentBuilder.openChat(attachments.length > 0 ? { attachments } : {});
  for (const attachment of attachments) {
    agentBuilder.addAttachment(attachment);
  }
  // Defer so React props/state updates (attachments) can commit before send.
  // Fresh sidebars also queue via pendingSubmitMessage until Conversation mounts.
  setTimeout(() => {
    agentBuilder.submitMessage(PRETTIFY_DASHBOARD_PROMPT);
  }, 0);
};

/**
 * Attaches an optional viewport screenshot to the active conversation and sends the Prettify prompt.
 * Used by the canvas Prettify action where chat is already open (dashboard attachment already present).
 */
export const submitPrettifyWithScreenshotInConversation = async ({
  addAttachment,
  submitMessage,
  files,
}: {
  addAttachment?: (attachment: AttachmentInput) => void;
  submitMessage?: (message: string) => void;
  files: FilesStart;
}): Promise<void> => {
  if (!submitMessage) {
    return;
  }
  const attachment = await screenshotAttachment(files);
  if (attachment && addAttachment) {
    addAttachment(attachment);
  }
  // Defer so addAttachment's React state update can commit before send.
  setTimeout(() => {
    submitMessage(PRETTIFY_DASHBOARD_PROMPT);
  }, 0);
};
