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
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import type { RuleApiResponse } from '../services/rules_api';
import { registerRuleAutoAttach } from './rule_auto_attach';

const createRule = (overrides?: Partial<RuleApiResponse>): RuleApiResponse =>
  ({
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
    ...overrides,
  } as RuleApiResponse);

describe('registerRuleAutoAttach', () => {
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let focusedRule$: BehaviorSubject<RuleApiResponse | undefined>;
  let addAttachment: jest.Mock;
  let removeAttachment: jest.Mock;
  let cleanup: () => void;
  let chatEventsByConversationId: Map<string, Subject<ChatEvent>>;

  beforeEach(() => {
    jest.useFakeTimers();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    focusedRule$ = new BehaviorSubject<RuleApiResponse | undefined>(undefined);
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

    cleanup = registerRuleAutoAttach({
      agentBuilder,
      chrome,
      focusedRule$,
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('does not attach when the Agent Builder sidebar is closed', () => {
    focusedRule$.next(createRule());
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('attaches the focused rule with a deterministic id', () => {
    const rule = createRule();

    focusedRule$.next(rule);
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith({
      id: 'rule:rule-1',
      type: RULE_ATTACHMENT_TYPE,
      origin: 'rule-1',
      data: rule,
    });
  });

  it('attaches the focused rule when an existing conversation becomes active', () => {
    focusedRule$.next(createRule());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'rule-1' }));
  });

  it('does not restage after the conversation is persisted', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedRule$.next(createRule({ id: 'rule-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('attaches when navigating to a rule while an existing conversation is open', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    focusedRule$.next(createRule({ id: 'rule-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'rule-1' }));
  });

  it('attaches a different focused rule after the conversation has started', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedRule$.next(createRule({ id: 'rule-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'rule:rule-1', origin: 'rule-1' })
    );

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    focusedRule$.next(createRule({ id: 'rule-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'rule:rule-2', origin: 'rule-2' })
    );
  });

  it('uses deterministic ids based on rule id', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedRule$.next(createRule({ id: 'rule-1' }));
    jest.runOnlyPendingTimers();
    focusedRule$.next(createRule({ id: 'rule-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'rule:rule-1', origin: 'rule-1' })
    );
    expect(addAttachment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'rule:rule-2', origin: 'rule-2' })
    );
  });

  it('unsubscribes on cleanup', () => {
    cleanup();

    focusedRule$.next(createRule());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
