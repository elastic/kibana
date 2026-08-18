/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, Subscription, type Observable } from 'rxjs';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';

/*
 * Converts a focused item into an `AttachmentInput` ready for staging.
 * The returned attachment id should be deterministic and entity-scoped
 * (e.g. `episode:{episodeId}`) so persisted attachments remain uniquely
 * identifiable. When the focused item changes, `registerAutoAttach`
 * removes the previous staged attachment before adding the new one.
 */
export interface AttachmentConverter<FocusedItem> {
  toAttachment: (item: FocusedItem) => AttachmentInput;
  getOrigin: (item: FocusedItem) => string;
}

/*
 * Auto-stage the focused item when the AI Agent sidebar is bound.
 * Stage once per item per conversation: first focus attaches even to an
 * existing chat, but later turns must not restage the same origin. A new
 * composer draft clears that memory so the current item can attach again.
 */
export const registerAutoAttach = <FocusedItem>({
  agentBuilder,
  chrome,
  focusedItem$,
  converter,
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  focusedItem$: Observable<FocusedItem | undefined>;
  converter: AttachmentConverter<FocusedItem>;
}): (() => void) => {
  const subscription = new Subscription();
  let pendingAddAttachmentTimeout: ReturnType<typeof setTimeout> | undefined;
  let lastStagedOrigin: string | undefined;
  let lastStagedId: string | undefined;
  let lastConversationId: string | undefined;
  let isAgentBuilderOpen = false;

  const cancelPendingAddAttachment = () => {
    if (pendingAddAttachmentTimeout !== undefined) {
      clearTimeout(pendingAddAttachmentTimeout);
      pendingAddAttachmentTimeout = undefined;
    }
  };

  /* Stage the focused item when all three conditions are met: the Agent Builder
   * sidebar is open, a conversation exists, and a focused item is present.
   * Deduplicates by origin so the same item is not restaged, and resets when
   * the user starts a new conversation draft. When the focused item changes,
   * the previous staged attachment is removed first so only one draft pill of
   * this type is visible at a time.
   */
  subscription.add(
    combineLatest([
      chrome.sidebar.getCurrentAppId$(),
      focusedItem$,
      agentBuilder.events.ui.activeConversation$,
    ]).subscribe(([appId, focused, conversation]) => {
      isAgentBuilderOpen = appId === AGENTBUILDER_FEATURE_ID && conversation !== null;

      if (conversation !== null) {
        const conversationId = conversation.id;

        if (!conversationId && lastConversationId) {
          lastStagedOrigin = undefined;
          lastStagedId = undefined;
        }

        lastConversationId = conversationId;
      }

      if (!isAgentBuilderOpen || !focused) {
        cancelPendingAddAttachment();

        if (!focused && isAgentBuilderOpen && lastStagedId) {
          agentBuilder.removeAttachment(lastStagedId);
          lastStagedId = undefined;
          lastStagedOrigin = undefined;
        }

        return;
      }

      const origin = converter.getOrigin(focused);

      if (origin === lastStagedOrigin) {
        return;
      }

      cancelPendingAddAttachment();

      const previousStagedId = lastStagedId;
      const attachment = converter.toAttachment(focused);

      lastStagedOrigin = origin;
      lastStagedId = attachment.id;

      /*
       * Defer until the active conversation change has fully propagated. The AI Agent
       * sidebar registers its attachment callbacks during render, so calling
       * addAttachment synchronously here can run before the sidebar is ready to accept it.
       */
      pendingAddAttachmentTimeout = setTimeout(() => {
        pendingAddAttachmentTimeout = undefined;

        if (previousStagedId && previousStagedId !== attachment.id) {
          agentBuilder.removeAttachment(previousStagedId);
        }

        agentBuilder.addAttachment(attachment);
      });
    })
  );

  return () => {
    subscription.unsubscribe();
    cancelPendingAddAttachment();

    if (isAgentBuilderOpen && lastStagedId) {
      agentBuilder.removeAttachment(lastStagedId);
    }
  };
};
