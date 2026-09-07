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
import { ACTION_POLICY_ATTACHMENT_TYPE, type ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import type { AutoAttachServices } from './use_auto_attach';
import { useActionPolicyAutoAttach } from './use_action_policy_auto_attach';

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

    renderHook(() => useActionPolicyAutoAttach(policy, services));
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

    renderHook(() => useActionPolicyAutoAttach(policy, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages when sidebar opens after mount', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useActionPolicyAutoAttach(policy, services));
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

    const { rerender } = renderHook(({ item }) => useActionPolicyAutoAttach(item, services), {
      initialProps: { item: policy },
    });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

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

    renderHook(() => useActionPolicyAutoAttach(undefined, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not stage when Agent Builder is unavailable', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    renderHook(() => useActionPolicyAutoAttach(policy, { ...services, agentBuilder: undefined }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('cleans up subscriptions on unmount', () => {
    activeConversation$.next({ id: undefined });

    const { unmount } = renderHook(() => useActionPolicyAutoAttach(policy, services));
    unmount();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
