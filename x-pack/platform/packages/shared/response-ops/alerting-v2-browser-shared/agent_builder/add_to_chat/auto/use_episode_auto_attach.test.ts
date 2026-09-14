/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import {
  ALERT_EPISODE_STATUS,
  EPISODE_ATTACHMENT_TYPE,
  type AlertEpisode,
} from '@kbn/alerting-v2-schemas';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import type { AutoAttachServices } from './use_auto_attach';
import { useEpisodeAutoAttach } from './use_episode_auto_attach';

jest.mock('@kbn/alerting-v2-utils', () => ({
  ...jest.requireActual('@kbn/alerting-v2-utils'),
  alertEpisodeToEpisodeAttachment: (episode: unknown) => ({
    ...(episode as Record<string, unknown>),
    __mapped: true,
  }),
}));

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

describe('useEpisodeAutoAttach', () => {
  let addAttachment: jest.Mock;
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let chatEvents$: Subject<ChatEvent>;
  let services: AutoAttachServices;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    addAttachment = jest.fn();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    chatEvents$ = new Subject<ChatEvent>();

    services = {
      chrome: {
        sidebar: {
          getCurrentAppId$: () => currentAppId$.asObservable(),
        },
      } as unknown as ChromeStart,
      agentBuilder: {
        addAttachment,
        removeAttachment: jest.fn(),
        events: {
          ui: { activeConversation$: activeConversation$.asObservable() },
          getChatEvents$: () => chatEvents$.asObservable(),
        },
      } as unknown as AgentBuilderPluginStart,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stages when sidebar is already open on mount', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(episode, { ruleName: 'Rule A' }, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'episode:ep-1',
        type: EPISODE_ATTACHMENT_TYPE,
        origin: 'ep-1',
      })
    );
  });

  it('does not stage on mount when sidebar is closed', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(episode, undefined, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages when sidebar opens after mount', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(episode, undefined, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'ep-1' }));
  });

  it('does not double-stage the same episode', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(episode, undefined, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('stages the new episode when it changes (same hook instance)', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    const episode2 = { ...episode, 'episode.id': 'ep-2' } as AlertEpisode;

    const { rerender } = renderHook(({ ep }) => useEpisodeAutoAttach(ep, undefined, services), {
      initialProps: { ep: episode },
    });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    rerender({ ep: episode2 });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'episode:ep-2', origin: 'ep-2' })
    );
  });

  it('does not stage when episode is undefined', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useEpisodeAutoAttach(undefined, undefined, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not stage when Agent Builder is unavailable', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    renderHook(() =>
      useEpisodeAutoAttach(episode, undefined, { ...services, agentBuilder: undefined })
    );
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('cleans up subscriptions on unmount', () => {
    activeConversation$.next({ id: undefined });

    const { unmount } = renderHook(() => useEpisodeAutoAttach(episode, undefined, services));
    unmount();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
