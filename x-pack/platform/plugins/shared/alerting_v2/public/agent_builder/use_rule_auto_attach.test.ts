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
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import type { RuleApiResponse } from '../services/rules_api';
import { useRuleAutoAttach } from './use_rule_auto_attach';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

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
} as RuleApiResponse;

describe('useRuleAutoAttach', () => {
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

    renderHook(() => useRuleAutoAttach(rule));
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

    renderHook(() => useRuleAutoAttach(rule));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('stages when sidebar opens after mount', () => {
    activeConversation$.next({ id: undefined });

    renderHook(() => useRuleAutoAttach(rule));
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

    const { rerender } = renderHook(({ item }) => useRuleAutoAttach(item), {
      initialProps: { item: rule },
    });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'rule:rule-1', origin: 'rule-1' })
    );

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

    renderHook(() => useRuleAutoAttach(undefined));
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
    renderHook(() => useRuleAutoAttach(rule));
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('cleans up subscriptions on unmount', () => {
    activeConversation$.next({ id: undefined });

    const { unmount } = renderHook(() => useRuleAutoAttach(rule));
    unmount();

    act(() => {
      currentAppId$.next(AGENTBUILDER_FEATURE_ID);
      jest.runOnlyPendingTimers();
    });

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
