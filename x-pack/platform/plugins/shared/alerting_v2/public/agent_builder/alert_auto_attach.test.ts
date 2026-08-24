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
import type { ChatEvent } from '@kbn/agent-builder-common';
import {
  ALERT_EPISODE_STATUS,
  ALERT_ATTACHMENT_TYPE,
  type AlertEpisode,
} from '@kbn/alerting-v2-schemas';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { registerAlertAutoAttach, type FocusedEpisode } from './alert_auto_attach';

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

describe('registerAlertAutoAttach', () => {
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let focusedEpisode$: BehaviorSubject<FocusedEpisode | undefined>;
  let addAttachment: jest.Mock;
  let removeAttachment: jest.Mock;
  let cleanup: () => void;
  let chatEventsByConversationId: Map<string, Subject<ChatEvent>>;

  beforeEach(() => {
    jest.useFakeTimers();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    focusedEpisode$ = new BehaviorSubject<FocusedEpisode | undefined>(undefined);
    addAttachment = jest.fn();
    removeAttachment = jest.fn();
    chatEventsByConversationId = new Map();

    const chrome = {
      sidebar: {
        getCurrentAppId$: () => currentAppId$.asObservable(),
      },
    } as unknown as ChromeStart;

    const agentBuilder = {
      addAttachment,
      removeAttachment,
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

    cleanup = registerAlertAutoAttach({
      agentBuilder,
      chrome,
      focusedEpisode$,
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('does not attach when the Agent Builder sidebar is closed', () => {
    focusedEpisode$.next({ episode: createEpisode() });
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('attaches the focused episode with a deterministic id', () => {
    const episode = createEpisode({
      last_assignee_uid: null,
      episode_data: null,
      severity: null,
    });

    focusedEpisode$.next({ episode });
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith({
      id: 'alert:ep-1',
      type: ALERT_ATTACHMENT_TYPE,
      origin: 'ep-1',
      data: expect.objectContaining({
        'alert.id': 'ep-1',
        last_assignee_uid: undefined,
        alert_data: undefined,
        severity: undefined,
      }),
    });
  });

  it('includes the focused episode label on the attachment', () => {
    focusedEpisode$.next({ episode: createEpisode(), ruleName: 'Host CPU high' });
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ 'alert.label': 'Host CPU high alert' }),
      })
    );
  });

  it('attaches the focused episode when an existing conversation becomes active', () => {
    focusedEpisode$.next({ episode: createEpisode() });
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'ep-1' }));
  });

  it('does not restage after the conversation is persisted', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedEpisode$.next({ episode: createEpisode({ 'episode.id': 'ep-1' }) });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('attaches when navigating to an episode while an existing conversation is open', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    focusedEpisode$.next({ episode: createEpisode({ 'episode.id': 'ep-1' }) });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'ep-1' }));
  });

  it('attaches a different focused episode after the conversation has started', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedEpisode$.next({ episode: createEpisode({ 'episode.id': 'ep-1' }) });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'alert:ep-1', origin: 'ep-1' })
    );

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    focusedEpisode$.next({ episode: createEpisode({ 'episode.id': 'ep-2' }) });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'alert:ep-2', origin: 'ep-2' })
    );
  });

  it('uses deterministic ids based on episode id', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedEpisode$.next({ episode: createEpisode({ 'episode.id': 'ep-1' }) });
    jest.runOnlyPendingTimers();
    focusedEpisode$.next({ episode: createEpisode({ 'episode.id': 'ep-2' }) });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'alert:ep-1', origin: 'ep-1' })
    );
    expect(addAttachment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'alert:ep-2', origin: 'ep-2' })
    );
  });

  it('unsubscribes on cleanup', () => {
    cleanup();

    focusedEpisode$.next({ episode: createEpisode() });
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
