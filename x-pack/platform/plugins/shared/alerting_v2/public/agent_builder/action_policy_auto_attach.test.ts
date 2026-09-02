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
import { ACTION_POLICY_ATTACHMENT_TYPE, type ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { registerActionPolicyAutoAttach } from './action_policy_auto_attach';

const createPolicy = (overrides?: Partial<ActionPolicyResponse>): ActionPolicyResponse =>
  ({
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
    ...overrides,
  } as ActionPolicyResponse);

describe('registerActionPolicyAutoAttach', () => {
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let focusedActionPolicy$: BehaviorSubject<ActionPolicyResponse | undefined>;
  let addAttachment: jest.Mock;
  let removeAttachment: jest.Mock;
  let cleanup: () => void;
  let chatEventsByConversationId: Map<string, Subject<ChatEvent>>;

  beforeEach(() => {
    jest.useFakeTimers();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    focusedActionPolicy$ = new BehaviorSubject<ActionPolicyResponse | undefined>(undefined);
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

    cleanup = registerActionPolicyAutoAttach({
      agentBuilder,
      chrome,
      focusedActionPolicy$,
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('does not attach when the Agent Builder sidebar is closed', () => {
    focusedActionPolicy$.next(createPolicy());
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('attaches the focused action policy with a deterministic id', () => {
    const policy = createPolicy({
      matcher: null,
      group_by: null,
      tags: null,
      snoozed_until: null,
    });

    focusedActionPolicy$.next(policy);
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith({
      id: 'action_policy:policy-1',
      type: ACTION_POLICY_ATTACHMENT_TYPE,
      origin: 'policy-1',
      data: expect.objectContaining({
        id: 'policy-1',
        name: 'Critical production alerts',
        matcher: undefined,
        group_by: undefined,
        tags: undefined,
        snoozed_until: undefined,
      }),
    });
  });

  it('attaches the focused action policy when an existing conversation becomes active', () => {
    focusedActionPolicy$.next(createPolicy());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'policy-1' }));
  });

  it('does not restage after the conversation is persisted', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedActionPolicy$.next(createPolicy({ id: 'policy-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
  });

  it('attaches when navigating to an action policy while an existing conversation is open', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    focusedActionPolicy$.next(createPolicy({ id: 'policy-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'policy-1' }));
  });

  it('attaches a different focused action policy after the conversation has started', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedActionPolicy$.next(createPolicy({ id: 'policy-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'action_policy:policy-1', origin: 'policy-1' })
    );

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);

    focusedActionPolicy$.next(createPolicy({ id: 'policy-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'action_policy:policy-2', origin: 'policy-2' })
    );
  });

  it('uses deterministic ids based on action policy id', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedActionPolicy$.next(createPolicy({ id: 'policy-1' }));
    jest.runOnlyPendingTimers();
    focusedActionPolicy$.next(createPolicy({ id: 'policy-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'action_policy:policy-1', origin: 'policy-1' })
    );
    expect(addAttachment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'action_policy:policy-2', origin: 'policy-2' })
    );
  });

  it('unsubscribes on cleanup', () => {
    cleanup();

    focusedActionPolicy$.next(createPolicy());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
