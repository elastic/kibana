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
import { ACTION_POLICY_ATTACHMENT_TYPE, type ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { useActionPolicyAutoAttach } from './use_action_policy_auto_attach';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const policy = {
  id: 'policy-1',
  name: 'Critical production alerts',
  description: 'Routes critical alerts',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  matcher: 'data.severity : "critical"',
  group_by: ['host.name'],
  tags: ['production'],
  grouping_mode: 'per_field',
  throttle: { strategy: 'time_interval', interval: '5m' },
  snoozed_until: null,
  created_by: 'alice',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'alice',
  updated_at: '2026-01-01T00:00:00.000Z',
  auth: { owner: 'alice', created_by_user: true },
} as ActionPolicyResponse;

describe('useActionPolicyAutoAttach', () => {
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

    renderHook(() => useActionPolicyAutoAttach(policy));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'action_policy:policy-1',
        type: ACTION_POLICY_ATTACHMENT_TYPE,
        origin: 'policy-1',
      })
    );
  });

  it('does not stage on mount when sidebar is closed', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useActionPolicyAutoAttach(policy));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages when sidebar opens after mount', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useActionPolicyAutoAttach(policy));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'policy-1' }));
  });

  it('stages the new action policy when it changes', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    const policy2 = { ...policy, id: 'policy-2' };

    const { rerender } = renderHook(({ item }) => useActionPolicyAutoAttach(item), {
      initialProps: { item: policy },
    });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'action_policy:policy-1', origin: 'policy-1' })
    );

    rerender({ item: policy2 });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'action_policy:policy-2', origin: 'policy-2' })
    );
  });

  it('does not stage when policy is undefined', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useActionPolicyAutoAttach(undefined));
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
    renderHook(() => useActionPolicyAutoAttach(policy));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('cleans up subscriptions on unmount', () => {
    activeConversation$.next({ id: undefined });

    const { unmount } = renderHook(() => useActionPolicyAutoAttach(policy));
    unmount();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
