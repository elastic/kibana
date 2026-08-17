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
  EPISODE_ATTACHMENT_TYPE,
  type AlertEpisode,
  type EpisodeAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { alertEpisodeToEpisodeAttachment } from '../../common/agent_builder/episode_mappers';
import type { FocusedEpisodeService } from '../services/focused_episode_service';

export type PendingEpisodeAttachment = AttachmentInput<
  typeof EPISODE_ATTACHMENT_TYPE,
  EpisodeAttachmentData
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

const toAttachment = (
  episode: AlertEpisode,
  id: string,
  options?: { ruleName?: string; groupingFields?: readonly string[] }
): PendingEpisodeAttachment => ({
  id,
  type: EPISODE_ATTACHMENT_TYPE,
  origin: episode['episode.id'],
  data: alertEpisodeToEpisodeAttachment(episode, options),
});

/*
 * Keep one stable id while the attachment is still a draft so opening another
 * episode before send updates the existing input pill instead of adding duplicates.
 * Once the draft is sent, that id belongs to a persisted conversation attachment,
 * so rotate it to avoid later auto-attachments mutating the old attachment. Closing
 * the sidebar also discards the input draft, so the next open should start fresh.
 */
export const createEpisodeAttachmentIdRegenerationSubscription = ({
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
       * immediately so a later episode navigation cannot mutate that sent attachment
       * while waiting for round-complete.
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
 * Auto-stage the focused episode whenever the AI Agent sidebar is bound.
 * `addAttachment` upserts by id, so repeat calls update the input pill in place.
 * After send, Agent Builder clears staged attachments; restaging on the
 * persisted-conversation emit puts the current episode back on the next message.
 */
export const registerEpisodeAutoAttach = ({
  agentBuilder,
  chrome,
  focusedEpisodeService,
  draftAttachmentId = createIdGenerator(),
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  focusedEpisodeService: FocusedEpisodeService;
  draftAttachmentId?: IdGenerator;
}): (() => void) => {
  const subscription = new Subscription();
  let pendingAddAttachmentTimeout: ReturnType<typeof setTimeout> | undefined;

  const addAttachment = (
    episode: AlertEpisode,
    options?: { ruleName?: string; groupingFields?: readonly string[] }
  ) => {
    agentBuilder.addAttachment(toAttachment(episode, draftAttachmentId.current, options));
  };

  const cancelPendingAddAttachment = () => {
    if (pendingAddAttachmentTimeout !== undefined) {
      clearTimeout(pendingAddAttachmentTimeout);
      pendingAddAttachmentTimeout = undefined;
    }
  };

  subscription.add(
    createEpisodeAttachmentIdRegenerationSubscription({
      agentBuilder,
      chrome,
      draftAttachmentId,
    })
  );

  subscription.add(
    combineLatest([
      chrome.sidebar.getCurrentAppId$(),
      focusedEpisodeService.focusedEpisode$,
      agentBuilder.events.ui.activeConversation$,
    ]).subscribe(([appId, focused, conversation]) => {
      const isAgentBuilderOpen = appId === AGENTBUILDER_FEATURE_ID && conversation !== null;

      if (!isAgentBuilderOpen || !focused) {
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
        addAttachment(focused.episode, {
          ruleName: focused.ruleName,
          groupingFields: focused.groupingFields,
        });
      });
    })
  );

  return () => {
    subscription.unsubscribe();
    cancelPendingAddAttachment();
  };
};
