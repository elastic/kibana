/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import { ChatEventType, type ChatEvent } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ALERT_EPISODE_STATUS, EPISODE_ATTACHMENT_TYPE, type AlertEpisode } from '@kbn/alerting-v2-schemas';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { FocusedEpisodeService } from '../services/focused_episode_service';
import { registerEpisodeAutoAttach, type IdGenerator } from './episode_auto_attach';

const createEpisode = (overrides?: Partial<AlertEpisode>): AlertEpisode => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-01-01T00:00:00.000Z',
  last_timestamp: '2026-01-01T01:00:00.000Z',
  duration: 3600000,
  ...overrides,
});

const createVersionedAttachment = (id: string): VersionedAttachment => ({
  id,
  type: EPISODE_ATTACHMENT_TYPE,
  versions: [
    {
      version: 1,
      data: createEpisode(),
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: 'hash',
    },
  ],
  current_version: 1,
});

const createRoundCompleteEvent = (attachmentId: string): ChatEvent => ({
  type: ChatEventType.roundComplete,
  data: {
    round: {} as never,
    attachments: [createVersionedAttachment(attachmentId)],
  },
});

const createIdGenerator = (): IdGenerator => {
  let current = 'draft-id-1';

  return {
    get current() {
      return current;
    },
    next: jest.fn(() => {
      current = current === 'draft-id-1' ? 'draft-id-2' : 'draft-id-3';
      return current;
    }),
  };
};

describe('registerEpisodeAutoAttach', () => {
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let focusedEpisodeService: FocusedEpisodeService;
  let addAttachment: jest.Mock;
  let draftAttachmentId: IdGenerator;
  let cleanup: () => void;
  let chatEventsByConversationId: Map<string, Subject<ChatEvent>>;

  beforeEach(() => {
    jest.useFakeTimers();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    focusedEpisodeService = new FocusedEpisodeService();
    addAttachment = jest.fn();
    draftAttachmentId = createIdGenerator();
    chatEventsByConversationId = new Map();

    const chrome = {
      sidebar: {
        getCurrentAppId$: () => currentAppId$.asObservable(),
      },
    } as unknown as ChromeStart;

    const agentBuilder = {
      addAttachment,
      events: {
        ui: { activeConversation$: activeConversation$.asObservable() },
        getChatEvents$: jest.fn((conversationId: string) => {
          let chatEvents$ = chatEventsByConversationId.get(conversationId);

          if (!chatEvents$) {
            chatEvents$ = new Subject<ChatEvent>();
            chatEventsByConversationId.set(conversationId, chatEvents$);
          }

          return chatEvents$.asObservable();
        }),
      },
    } as unknown as AgentBuilderPluginStart;

    cleanup = registerEpisodeAutoAttach({
      agentBuilder,
      chrome,
      focusedEpisodeService,
      draftAttachmentId,
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('does not attach when the Agent Builder sidebar is closed', () => {
    focusedEpisodeService.setFocusedEpisode(createEpisode());
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('attaches the focused episode to a new conversation draft when chat is open', () => {
    const episode = createEpisode({
      last_assignee_uid: null,
      episode_data: null,
      severity: null,
    });

    focusedEpisodeService.setFocusedEpisode(episode);
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith({
      id: 'draft-id-1',
      type: EPISODE_ATTACHMENT_TYPE,
      origin: 'ep-1',
      data: expect.objectContaining({
        'episode.id': 'ep-1',
        last_assignee_uid: undefined,
        episode_data: undefined,
        severity: undefined,
      }),
    });
  });

  it('does not attach to an existing conversation', () => {
    focusedEpisodeService.setFocusedEpisode(createEpisode());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('updates the same draft attachment when the focused episode changes before send', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedEpisodeService.setFocusedEpisode(createEpisode({ 'episode.id': 'ep-1' }));
    jest.runOnlyPendingTimers();
    focusedEpisodeService.setFocusedEpisode(createEpisode({ 'episode.id': 'ep-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'draft-id-1', origin: 'ep-1' })
    );
    expect(addAttachment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'draft-id-1', origin: 'ep-2' })
    );
  });

  it('rotates the draft id after it is created in a completed round', () => {
    focusedEpisodeService.setFocusedEpisode(createEpisode());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    chatEventsByConversationId.get('conversation-1')?.next(createRoundCompleteEvent('draft-id-1'));

    currentAppId$.next(null);
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'draft-id-3' }));
  });

  it('unsubscribes on cleanup', () => {
    cleanup();

    focusedEpisodeService.setFocusedEpisode(createEpisode());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
