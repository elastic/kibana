/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, EMPTY, filter, Subscription, switchMap, type Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';

export interface IdGenerator {
  readonly current: string;
  next: () => string;
}

export const createIdGenerator = (): IdGenerator => {
  let id = uuidv4();

  return {
    get current() {
      return id;
    },
    next() {
      id = uuidv4();
      return id;
    },
  };
};

/**
 * Converts a focused item into an `AttachmentInput` ready for staging.
 */
export interface AttachmentConverter<FocusedItem> {
  toAttachment: (item: FocusedItem, draftId: string) => AttachmentInput;
  getOrigin: (item: FocusedItem) => string;
}

/*
 * Keep one stable id while the attachment is still a draft so opening another
 * item before send updates the existing input pill instead of adding duplicates.
 * Once the draft is sent, that id belongs to a persisted conversation attachment,
 * so rotate it to avoid later auto-attachments mutating the old attachment. Closing
 * the sidebar also discards the input draft, so the next open should start fresh.
 */
export const createAttachmentIdRegenerationSubscription = ({
  agentBuilder,
  chrome,
  draftAttachmentId,
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  draftAttachmentId: IdGenerator;
}): Subscription => {
  const subscription = new Subscription();
  let wasAgentBuilderOpen = false;

  subscription.add(
    chrome.sidebar.getCurrentAppId$().subscribe((appId) => {
      const isAgentBuilderOpen = appId === AGENTBUILDER_FEATURE_ID;

      if (wasAgentBuilderOpen && !isAgentBuilderOpen) {
        draftAttachmentId.next();
      }

      wasAgentBuilderOpen = isAgentBuilderOpen;
    })
  );

  let hadConversationId = false;

  subscription.add(
    agentBuilder.events.ui.activeConversation$.subscribe((conversation) => {
      const hasConversationId = Boolean(conversation?.id);

      if (hasConversationId && !hadConversationId) {
        draftAttachmentId.next();
      }

      hadConversationId = hasConversationId;
    })
  );

  subscription.add(
    agentBuilder.events.ui.activeConversation$
      .pipe(
        switchMap((conversation) =>
          conversation?.id ? agentBuilder.events.getChatEvents$(conversation.id) : EMPTY
        ),
        filter(isRoundCompleteEvent)
      )
      .subscribe((event) => {
        if (event.data.attachments?.some(({ id }) => id === draftAttachmentId.current)) {
          draftAttachmentId.next();
        }
      })
  );

  return subscription;
};

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
  draftAttachmentId = createIdGenerator(),
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  focusedItem$: Observable<FocusedItem | undefined>;
  converter: AttachmentConverter<FocusedItem>;
  draftAttachmentId?: IdGenerator;
}): (() => void) => {
  const subscription = new Subscription();
  let pendingAddAttachmentTimeout: ReturnType<typeof setTimeout> | undefined;
  let lastStagedOrigin: string | undefined;
  let lastConversationId: string | undefined;

  const cancelPendingAddAttachment = () => {
    if (pendingAddAttachmentTimeout !== undefined) {
      clearTimeout(pendingAddAttachmentTimeout);
      pendingAddAttachmentTimeout = undefined;
    }
  };

  subscription.add(
    createAttachmentIdRegenerationSubscription({
      agentBuilder,
      chrome,
      draftAttachmentId,
    })
  );

  subscription.add(
    combineLatest([
      chrome.sidebar.getCurrentAppId$(),
      focusedItem$,
      agentBuilder.events.ui.activeConversation$,
    ]).subscribe(([appId, focused, conversation]) => {
      const isAgentBuilderOpen = appId === AGENTBUILDER_FEATURE_ID && conversation !== null;

      if (conversation !== null) {
        const conversationId = conversation.id;

        if (!conversationId && lastConversationId) {
          lastStagedOrigin = undefined;
        }

        lastConversationId = conversationId;
      }

      if (!isAgentBuilderOpen || !focused) {
        cancelPendingAddAttachment();
        return;
      }

      const origin = converter.getOrigin(focused);

      if (origin === lastStagedOrigin) {
        return;
      }

      lastStagedOrigin = origin;
      cancelPendingAddAttachment();

      /*
       * Defer until the active conversation change has fully propagated. The AI Agent
       * sidebar registers its attachment callbacks during render, so calling
       * addAttachment synchronously here can run before the sidebar is ready to accept it.
       */
      pendingAddAttachmentTimeout = setTimeout(() => {
        pendingAddAttachmentTimeout = undefined;
        agentBuilder.addAttachment(converter.toAttachment(focused, draftAttachmentId.current));
      });
    })
  );

  return () => {
    subscription.unsubscribe();
    cancelPendingAddAttachment();
  };
};
