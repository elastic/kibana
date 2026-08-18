/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import { PluginStart } from '@kbn/core-di';
import { CoreStart, useService } from '@kbn/core-di-browser';
import {
  ALERT_EPISODE_STATUS,
  EPISODE_ATTACHMENT_TYPE,
  type AlertEpisode,
} from '@kbn/alerting-v2-schemas';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { useEpisodeAutoAttach } from './use_episode_auto_attach';

jest.mock('@kbn/core-di-browser');
jest.mock('../../common/agent_builder/episode_mappers', () => ({
  alertEpisodeToEpisodeAttachment: (episode: unknown) => ({
    ...(episode as Record<string, unknown>),
    __mapped: true,
  }),
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const episode: AlertEpisode = {
  '@timestamp': '2026-01-01T00:00:00.000Z',
  'episode.id': 'ep-1',
  'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-01-01T00:00:00.000Z',
  last_timestamp: '2026-01-01T01:00:00.000Z',
  duration: 3600000,
};

const createRoundCompleteEvent = (attachmentId: string): ChatEvent => ({
  type: ChatEventType.roundComplete,
  data: {
    round: {} as never,
    attachments: [
      {
        id: attachmentId,
        type: EPISODE_ATTACHMENT_TYPE,
        versions: [
          {
            version: 1,
            data: episode,
            created_at: '2026-01-01T00:00:00.000Z',
            content_hash: 'hash',
          },
        ],
        current_version: 1,
      } as VersionedAttachment,
    ],
  },
});

describe('useEpisodeAutoAttach', () => {
  let addAttachment: jest.Mock;
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let chatEvents$: Subject<ChatEvent>;

  const setupMocks = () => {
    mockCoreStart.mockImplementation((key: string) => `core:${key}` as never);

    mockUseService.mockImplementation((token: unknown) => {
      if (token === 'core:chrome') {
        return {
          sidebar: {
            getCurrentAppId$: () => currentAppId$.asObservable(),
          },
        };
      }
      if (token === PluginStart('agentBuilder')) {
        return {
          addAttachment,
          events: {
            ui: { activeConversation$: activeConversation$.asObservable() },
            getChatEvents$: () => chatEvents$.asObservable(),
          },
        };
      }
      return undefined;
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    addAttachment = jest.fn();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    chatEvents$ = new Subject<ChatEvent>();
    setupMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stages when sidebar is already open on mount', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(episode, { ruleName: 'Rule A' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EPISODE_ATTACHMENT_TYPE,
        origin: 'ep-1',
      })
    );
  });

  it('does not stage on mount when sidebar is closed', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(episode));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages when sidebar opens after mount', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(episode));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ origin: 'ep-1' })
    );
  });

  it('does not double-stage the same episode', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(episode));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('replaces the draft attachment when episode changes (same hook instance)', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    const episode2 = { ...episode, 'episode.id': 'ep-2' } as AlertEpisode;

    const { rerender } = renderHook(
      ({ ep }) => useEpisodeAutoAttach(ep),
      { initialProps: { ep: episode } }
    );
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    rerender({ ep: episode2 });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);

    const firstId = addAttachment.mock.calls[0][0].id;
    const secondId = addAttachment.mock.calls[1][0].id;
    expect(firstId).toBe(secondId);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ origin: 'ep-2' })
    );
  });

  it('replaces the draft attachment when hook remounts with a different episode', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    const episode2 = { ...episode, 'episode.id': 'ep-2' } as AlertEpisode;

    const { unmount } = renderHook(() => useEpisodeAutoAttach(episode));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    const firstId = addAttachment.mock.calls[0][0].id;

    unmount();

    renderHook(() => useEpisodeAutoAttach(episode2));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    const secondId = addAttachment.mock.calls[1][0].id;

    expect(firstId).toBe(secondId);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ origin: 'ep-2' })
    );
  });

  it('rotates the draft id after the attachment is consumed by a round', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(episode));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    const draftId = addAttachment.mock.calls[0][0].id;

    activeConversation$.next({ id: 'conv-1', conversation: undefined });
    chatEvents$.next(createRoundCompleteEvent(draftId));

    // Simulate re-navigation to a new episode after send
    currentAppId$.next(null);
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    const newDraftId = addAttachment.mock.calls[1][0].id;

    expect(newDraftId).not.toBe(draftId);
  });

  it('does not stage when episode is undefined', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(undefined));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not stage when Agent Builder plugin is unavailable', () => {
    mockUseService.mockImplementation((token: unknown) => {
      if (token === 'core:chrome') {
        return {
          sidebar: {
            getCurrentAppId$: () => currentAppId$.asObservable(),
          },
        };
      }
      return undefined;
    });

    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    renderHook(() => useEpisodeAutoAttach(episode));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('cleans up subscriptions on unmount', () => {
    activeConversation$.next({ id: undefined });

    const { unmount } = renderHook(() => useEpisodeAutoAttach(episode));
    unmount();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
