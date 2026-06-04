/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, EMPTY, filter, Subscription, switchMap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { SigEvent } from '@kbn/streams-schema';
import {
  SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
  type PendingSignificantEventAttachment,
} from '@kbn/streams-plugin/common';
import type { FocusedSignificantEventService } from '../../services/significant_events/focused_significant_event_service';

const AGENT_BUILDER_SIDEBAR_APP_ID = 'agentBuilder' as const;

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

const toAttachment = (event: SigEvent, id: string): PendingSignificantEventAttachment => ({
  id,
  type: SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
  origin: event.discovery_slug,
  data: event,
});

const isNewConversation = (conversation: ActiveConversation | null): boolean => {
  return conversation !== null && !conversation.id;
};

export const createSignificantEventAttachmentIdRegenerationSubscription = ({
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
      const isAgentBuilderOpen = appId === AGENT_BUILDER_SIDEBAR_APP_ID;

      if (wasAgentBuilderOpen && !isAgentBuilderOpen) {
        draftAttachmentId.next();
      }

      wasAgentBuilderOpen = isAgentBuilderOpen;
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

export const registerSignificantEventAutoAttach = ({
  agentBuilder,
  chrome,
  focusedSignificantEventService,
  draftAttachmentId = createIdGenerator(),
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  focusedSignificantEventService: FocusedSignificantEventService;
  draftAttachmentId?: IdGenerator;
}): (() => void) => {
  const subscription = new Subscription();
  let pendingAddAttachmentTimeout: ReturnType<typeof setTimeout> | undefined;

  const addAttachment = (event: SigEvent) => {
    agentBuilder.addAttachment(toAttachment(event, draftAttachmentId.current));
  };

  subscription.add(
    createSignificantEventAttachmentIdRegenerationSubscription({
      agentBuilder,
      chrome,
      draftAttachmentId,
    })
  );

  subscription.add(
    combineLatest([
      chrome.sidebar.getCurrentAppId$(),
      focusedSignificantEventService.focusedEvent$,
      agentBuilder.events.ui.activeConversation$,
    ]).subscribe(([appId, event, conversation]) => {
      if (pendingAddAttachmentTimeout !== undefined) {
        clearTimeout(pendingAddAttachmentTimeout);
        pendingAddAttachmentTimeout = undefined;
      }

      if (appId !== AGENT_BUILDER_SIDEBAR_APP_ID || !event || !isNewConversation(conversation)) {
        return;
      }

      pendingAddAttachmentTimeout = setTimeout(() => {
        pendingAddAttachmentTimeout = undefined;
        addAttachment(event);
      });
    })
  );

  return () => {
    subscription.unsubscribe();

    if (pendingAddAttachmentTimeout !== undefined) {
      clearTimeout(pendingAddAttachmentTimeout);
      pendingAddAttachmentTimeout = undefined;
    }
  };
};
