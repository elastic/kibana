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
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { AutoAttachServices } from './use_auto_attach';
import { useRuleAutoAttach } from './use_rule_auto_attach';

const rule = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Host CPU high', version: 1 },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
  created_by: 'alice',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'alice',
  updated_at: '2026-01-01T00:00:00.000Z',
} as RuleResponse;

describe('useRuleAutoAttach', () => {
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

    renderHook(() => useRuleAutoAttach(rule, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rule:rule-1',
        type: RULE_ATTACHMENT_TYPE,
        origin: 'rule-1',
      })
    );
  });

  it('does not stage on mount when sidebar is closed', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useRuleAutoAttach(rule, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages when sidebar opens after mount', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useRuleAutoAttach(rule, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'rule-1' }));
  });

  it('stages the new rule when it changes', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    const rule2 = { ...rule, id: 'rule-2' };

    const { rerender } = renderHook(({ item }) => useRuleAutoAttach(item, services), {
      initialProps: { item: rule },
    });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    rerender({ item: rule2 });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'rule:rule-2', origin: 'rule-2' })
    );
  });

  it('does not stage when rule is undefined', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    renderHook(() => useRuleAutoAttach(undefined, services));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not stage when Agent Builder is unavailable', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    renderHook(() => useRuleAutoAttach(rule, { ...services, agentBuilder: undefined }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('cleans up subscriptions on unmount', () => {
    activeConversation$.next({ id: undefined });

    const { unmount } = renderHook(() => useRuleAutoAttach(rule, services));
    unmount();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
