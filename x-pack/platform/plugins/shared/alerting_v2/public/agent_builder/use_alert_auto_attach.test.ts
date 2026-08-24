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
  ALERT_ATTACHMENT_TYPE,
  type AlertEpisode,
} from '@kbn/alerting-v2-schemas';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { useAlertAutoAttach } from './use_alert_auto_attach';

jest.mock('@kbn/core-di-browser');
jest.mock('../../common/agent_builder/alert_mappers', () => ({
  alertEpisodeToAlertAttachment: (episode: unknown) => ({
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

describe('useAlertAutoAttach', () => {
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
          removeAttachment: jest.fn(),
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

    renderHook(() => useAlertAutoAttach(episode, { ruleName: 'Rule A' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'alert:ep-1',
        type: ALERT_ATTACHMENT_TYPE,
        origin: 'ep-1',
      })
    );
  });

  it('does not stage on mount when sidebar is closed', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useAlertAutoAttach(episode));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages when sidebar opens after mount', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useAlertAutoAttach(episode));
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

    renderHook(() => useAlertAutoAttach(episode));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('stages the new episode when it changes (same hook instance)', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    const episode2 = { ...episode, 'episode.id': 'ep-2' } as AlertEpisode;

    const { rerender } = renderHook(({ ep }) => useAlertAutoAttach(ep), {
      initialProps: { ep: episode },
    });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'alert:ep-1', origin: 'ep-1' })
    );

    rerender({ ep: episode2 });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'alert:ep-2', origin: 'ep-2' })
    );
  });

  it('stages the new episode when hook remounts with a different episode', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    const episode2 = { ...episode, 'episode.id': 'ep-2' } as AlertEpisode;

    const { unmount } = renderHook(() => useAlertAutoAttach(episode));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    unmount();

    renderHook(() => useAlertAutoAttach(episode2));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'alert:ep-2', origin: 'ep-2' })
    );
  });

  it('does not stage when episode is undefined', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useAlertAutoAttach(undefined));
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
    renderHook(() => useAlertAutoAttach(episode));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('cleans up subscriptions on unmount', () => {
    activeConversation$.next({ id: undefined });

    const { unmount } = renderHook(() => useAlertAutoAttach(episode));
    unmount();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
