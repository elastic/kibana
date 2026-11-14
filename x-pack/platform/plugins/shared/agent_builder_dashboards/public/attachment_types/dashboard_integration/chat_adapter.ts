/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, filter, map, switchMap, tap, type Observable } from 'rxjs';
import type {
  ActiveConversation,
  AgentBuilderPluginStart,
  BrowserChatEvent,
} from '@kbn/agent-builder-browser';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import {
  isToolUiEvent,
  type ToolUiEvent,
  type UpdateOriginResponse,
} from '@kbn/agent-builder-common';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  isDashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_UPDATED_UI_EVENT, type DashboardUpdatedUiEventData } from '../../../common';
import type { IdGenerator } from '..';

/*
 * Everything the dashboard integration needs from the chat, so it deals with dashboard attachments
 * and not with how the chat publishes and stages them.
 */

export interface ConversationChange {
  conversationId: string | undefined;
  /** The conversation's dashboard attachments, each at its latest version. */
  attachments: DashboardAttachment[];
}

export interface ChatAdapter {
  /** Changes of the conversation open in the chat, `null` when the chat closes. */
  conversationChanges$: Observable<ConversationChange | null>;
  /** Dashboard attachments the agent updated, as soon as the tool that updated them finishes. */
  dashboardUpdates$: Observable<DashboardAttachment>;
  /** Stages the attachment in the chat input, replacing what it staged before under the same id. */
  stage: (attachment: Omit<DashboardAttachment, 'type'>) => void;
  /** Removes the attachment it staged from the chat input. */
  unstage: () => void;
  /** Persists the attachment's origin, keeping the rendered conversation in sync. */
  updateOrigin: (
    attachmentId: string,
    origin: string
  ) => Promise<UpdateOriginResponse | undefined> | undefined;
}

const toDashboardAttachments = (
  conversation: ActiveConversation['conversation']
): DashboardAttachment[] =>
  (conversation?.attachments ?? [])
    .filter(isDashboardAttachment)
    .flatMap((attachment): DashboardAttachment[] => {
      const { id, type, origin } = attachment;
      const latestVersionData = getLatestVersion(attachment)?.data;
      return latestVersionData ? [{ id, type, origin, data: latestVersionData }] : [];
    });

const isDashboardUpdatedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<typeof DASHBOARD_UPDATED_UI_EVENT, DashboardUpdatedUiEventData> =>
  isToolUiEvent(event, DASHBOARD_UPDATED_UI_EVENT);

export const createChatAdapter = ({
  agentBuilder,
  draftAttachmentId,
  getUpdateOrigin,
}: {
  agentBuilder: AgentBuilderPluginStart;
  draftAttachmentId: IdGenerator;
  /**
   * Lookup for the framework-provided `updateOrigin` callback bound to a specific attachment id.
   * Returns `undefined` when the attachment has not been rendered yet. Unlike
   * `agentBuilder.updateAttachmentOrigin`, it invalidates the conversation query after persisting
   * the new origin.
   */
  getUpdateOrigin: (
    attachmentId: string
  ) => ((origin: string) => Promise<UpdateOriginResponse | undefined>) | undefined;
}): ChatAdapter => {
  const { activeConversation$ } = agentBuilder.events.ui;
  let stagedAttachmentId: string | undefined;

  const conversationChanges$ = activeConversation$.pipe(
    // the draft id is used once, so later drafts don't replace the attachment it became
    tap((change) => {
      if (change?.conversation?.attachments?.some(({ id }) => id === draftAttachmentId.current)) {
        draftAttachmentId.next();
      }
    }),
    map((change) =>
      change
        ? { conversationId: change.id, attachments: toDashboardAttachments(change.conversation) }
        : null
    )
  );

  const dashboardUpdates$ = activeConversation$.pipe(
    switchMap((change) => (change?.id ? agentBuilder.events.getChatEvents$(change.id) : EMPTY)),
    filter(isDashboardUpdatedUiEvent),
    map((event) => event.data.data.attachment)
  );

  return {
    conversationChanges$,
    dashboardUpdates$,
    stage: ({ id, origin, data }) => {
      stagedAttachmentId = id;
      agentBuilder.addAttachment({ id, origin, type: DASHBOARD_ATTACHMENT_TYPE, data });
    },
    unstage: () => {
      if (stagedAttachmentId) {
        agentBuilder.removeAttachment(stagedAttachmentId);
        stagedAttachmentId = undefined;
      }
    },
    updateOrigin: (attachmentId, origin) => getUpdateOrigin(attachmentId)?.(origin),
  };
};
