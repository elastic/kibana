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
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  getDashboardPanelAttachmentId,
  isDashboardAttachment,
  isDashboardPanelAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_UPDATED_UI_EVENT, type DashboardUpdatedUiEventData } from '../../../common';
import type { IdGenerator } from '..';
import type { PanelPointer } from './panel_pointer_labels';

/*
 * Everything the dashboard integration needs from the chat, so it deals with dashboard attachments
 * and not with how the chat publishes and stages them.
 */

/** A dashboard attachment of the conversation at its latest version. */
export type ConversationDashboardAttachment = DashboardAttachment & { version: number };

export interface ConversationChange {
  conversationId: string | undefined;
  /** The conversation's dashboard attachments, each at its latest version. */
  attachments: ConversationDashboardAttachment[];
  /** The conversation's panel pointers the user hasn't removed, each at its latest version. */
  panelPointers: PanelPointer[];
}

export interface ChatAdapter {
  /** Changes of the conversation open in the chat, `null` when the chat closes. */
  conversationChanges$: Observable<ConversationChange | null>;
  /** Dashboard attachments the agent updated, as soon as the tool that updated them finishes. */
  dashboardUpdates$: Observable<DashboardAttachment>;
  /** Stages the attachment in the chat input, replacing the attachment it staged before. */
  stage: (attachment: Omit<DashboardAttachment, 'type'>) => void;
  /** Removes the attachment from the chat input when it is the one staged. */
  unstage: (attachmentId: string) => void;
  /** Stages the panel pointer in the chat input, replacing the one with the same id. */
  stagePanelPointer: (pointer: PanelPointer) => void;
  /** Removes the pointers to these panels of these dashboard attachments from the chat input. Sent pointers stay. */
  unstagePanelPointers: (pointers: {
    dashboardAttachmentIds: Iterable<string>;
    panelIds: Iterable<string>;
  }) => void;
  /** Persists the attachment's origin, keeping the rendered conversation in sync. */
  updateOrigin: (
    attachmentId: string,
    origin: string
  ) => Promise<UpdateOriginResponse | undefined> | undefined;
}

const toDashboardAttachments = (
  conversation: ActiveConversation['conversation']
): ConversationDashboardAttachment[] =>
  (conversation?.attachments ?? [])
    .filter(isDashboardAttachment)
    .flatMap((attachment): ConversationDashboardAttachment[] => {
      const { id, type, origin } = attachment;
      const latestVersion = getLatestVersion(attachment);
      return latestVersion?.data
        ? [{ id, type, origin, data: latestVersion.data, version: latestVersion.version }]
        : [];
    });

const toPanelPointers = (conversation: ActiveConversation['conversation']): PanelPointer[] =>
  (conversation?.attachments ?? [])
    .filter(isDashboardPanelAttachment)
    .flatMap((pointer): PanelPointer[] => {
      const data = getLatestVersion(pointer)?.data;
      return data && pointer.active !== false ? [{ id: pointer.id, data }] : [];
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
        ? {
            conversationId: change.id,
            attachments: toDashboardAttachments(change.conversation),
            panelPointers: toPanelPointers(change.conversation),
          }
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
      // switching conversations changes the id the dashboard is staged under, which would
      // otherwise leave a pill per conversation in the chat input
      if (stagedAttachmentId && stagedAttachmentId !== id) {
        agentBuilder.removeAttachment(stagedAttachmentId);
      }
      stagedAttachmentId = id;
      agentBuilder.addAttachment({ id, origin, type: DASHBOARD_ATTACHMENT_TYPE, data });
    },
    unstage: (attachmentId) => {
      if (stagedAttachmentId !== attachmentId) {
        return;
      }
      agentBuilder.removeAttachment(attachmentId);
      stagedAttachmentId = undefined;
    },
    stagePanelPointer: ({ id, data }) => {
      agentBuilder.addAttachment({ id, type: DASHBOARD_PANEL_ATTACHMENT_TYPE, data });
    },
    unstagePanelPointers: ({ dashboardAttachmentIds, panelIds }) => {
      const panelIdList = [...panelIds];
      for (const dashboardAttachmentId of new Set(dashboardAttachmentIds)) {
        for (const panelId of panelIdList) {
          agentBuilder.removeAttachment(
            getDashboardPanelAttachmentId({ dashboardAttachmentId, panelId })
          );
        }
      }
    },
    updateOrigin: (attachmentId, origin) => getUpdateOrigin(attachmentId)?.(origin),
  };
};
