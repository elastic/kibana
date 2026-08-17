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
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  ACTION_POLICY_ATTACHMENT_TYPE,
  type ActionPolicyAttachmentData,
  type ActionPolicyResponse,
} from '@kbn/alerting-v2-schemas';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import type { FocusedActionPolicyService } from '../services/focused_action_policy_service';

export type PendingActionPolicyAttachment = AttachmentInput<
  typeof ACTION_POLICY_ATTACHMENT_TYPE,
  ActionPolicyAttachmentData
>;

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

const toAttachmentData = (policy: ActionPolicyResponse): ActionPolicyAttachmentData => ({
  id: policy.id,
  version: policy.version,
  name: policy.name,
  description: policy.description,
  destinations: policy.destinations,
  matcher: policy.matcher ?? undefined,
  group_by: policy.group_by ?? undefined,
  tags: policy.tags ?? undefined,
  grouping_mode: policy.grouping_mode ?? undefined,
  throttle: policy.throttle ?? undefined,
  enabled: policy.enabled,
  snoozed_until: policy.snoozed_until ?? undefined,
  updated_at: policy.updated_at,
});

const toAttachment = (
  policy: ActionPolicyResponse,
  id: string
): PendingActionPolicyAttachment => ({
  id,
  type: ACTION_POLICY_ATTACHMENT_TYPE,
  origin: policy.id,
  data: toAttachmentData(policy),
});

/*
 * Keep one stable id while the attachment is still a draft so opening another
 * action policy before send updates the existing input pill instead of adding
 * duplicates. Once the draft is sent, that id belongs to a persisted conversation
 * attachment, so rotate it to avoid later auto-attachments mutating the old
 * attachment. Closing the sidebar also discards the input draft, so the next
 * open should start fresh.
 */
export const createActionPolicyAttachmentIdRegenerationSubscription = ({
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

      /*
       * The first send persists the conversation and the current draft id. Rotate
       * immediately so a later action policy navigation cannot mutate that sent
       * attachment while waiting for round-complete.
       */
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
 * Auto-stage the focused action policy whenever the AI Agent sidebar is bound.
 * `addAttachment` upserts by id, so repeat calls update the input pill in place.
 * After send, Agent Builder clears staged attachments; restaging on the
 * persisted-conversation emit puts the current action policy back on the next
 * message.
 */
export const registerActionPolicyAutoAttach = ({
  agentBuilder,
  chrome,
  focusedActionPolicyService,
  draftAttachmentId = createIdGenerator(),
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  focusedActionPolicyService: FocusedActionPolicyService;
  draftAttachmentId?: IdGenerator;
}): (() => void) => {
  const subscription = new Subscription();
  let pendingAddAttachmentTimeout: ReturnType<typeof setTimeout> | undefined;

  const addAttachment = (policy: ActionPolicyResponse) => {
    agentBuilder.addAttachment(toAttachment(policy, draftAttachmentId.current));
  };

  const cancelPendingAddAttachment = () => {
    if (pendingAddAttachmentTimeout !== undefined) {
      clearTimeout(pendingAddAttachmentTimeout);
      pendingAddAttachmentTimeout = undefined;
    }
  };

  subscription.add(
    createActionPolicyAttachmentIdRegenerationSubscription({
      agentBuilder,
      chrome,
      draftAttachmentId,
    })
  );

  subscription.add(
    combineLatest([
      chrome.sidebar.getCurrentAppId$(),
      focusedActionPolicyService.focusedActionPolicy$,
      agentBuilder.events.ui.activeConversation$,
    ]).subscribe(([appId, policy, conversation]) => {
      const isAgentBuilderOpen = appId === AGENTBUILDER_FEATURE_ID && conversation !== null;

      if (!isAgentBuilderOpen || !policy) {
        cancelPendingAddAttachment();
        return;
      }

      cancelPendingAddAttachment();

      /*
       * Defer until the active conversation change has fully propagated. The AI Agent
       * sidebar registers its attachment callbacks during render, so calling
       * addAttachment synchronously here can run before the sidebar is ready to accept it.
       */
      pendingAddAttachmentTimeout = setTimeout(() => {
        pendingAddAttachmentTimeout = undefined;
        addAttachment(policy);
      });
    })
  );

  return () => {
    subscription.unsubscribe();
    cancelPendingAddAttachment();
  };
};
