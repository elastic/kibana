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
import { ChatEventType, type ChatEvent } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ACTION_POLICY_ATTACHMENT_TYPE, type ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import { FocusedActionPolicyService } from '../services/focused_action_policy_service';
import { registerActionPolicyAutoAttach, type IdGenerator } from './action_policy_auto_attach';

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

const createVersionedAttachment = (id: string): VersionedAttachment => ({
  id,
  type: ACTION_POLICY_ATTACHMENT_TYPE,
  versions: [
    {
      version: 1,
      data: createPolicy(),
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: 'hash',
    },
  ],
  current_version: 1,
});

const createRoundCompleteEvent = (attachmentId: string): ChatEvent => ({
  type: ChatEventType.roundComplete,
  data: {
    round: {} as never,
    attachments: [createVersionedAttachment(attachmentId)],
  },
});

const createIdGenerator = (): IdGenerator => {
  let current = 'draft-id-1';

  return {
    get current() {
      return current;
    },
    next: jest.fn(() => {
      current = current === 'draft-id-1' ? 'draft-id-2' : 'draft-id-3';
      return current;
    }),
  };
};

describe('registerActionPolicyAutoAttach', () => {
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let focusedActionPolicyService: FocusedActionPolicyService;
  let addAttachment: jest.Mock;
  let draftAttachmentId: IdGenerator;
  let cleanup: () => void;
  let chatEventsByConversationId: Map<string, Subject<ChatEvent>>;

  beforeEach(() => {
    jest.useFakeTimers();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    focusedActionPolicyService = new FocusedActionPolicyService();
    addAttachment = jest.fn();
    draftAttachmentId = createIdGenerator();
    chatEventsByConversationId = new Map();

    const chrome = {
      sidebar: {
        getCurrentAppId$: () => currentAppId$.asObservable(),
      },
    } as unknown as ChromeStart;

    const agentBuilder = {
      addAttachment,
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
      focusedActionPolicyService,
      draftAttachmentId,
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('does not attach when the Agent Builder sidebar is closed', () => {
    focusedActionPolicyService.setFocusedActionPolicy(createPolicy());
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('attaches the focused action policy to a new conversation draft when chat is open', () => {
    const policy = createPolicy({
      matcher: null,
      group_by: null,
      tags: null,
      snoozed_until: null,
    });

    focusedActionPolicyService.setFocusedActionPolicy(policy);
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith({
      id: 'draft-id-1',
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
    focusedActionPolicyService.setFocusedActionPolicy(createPolicy());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'policy-1' }));
  });

  it('restages the focused action policy with a new draft id after the conversation is persisted', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedActionPolicyService.setFocusedActionPolicy(createPolicy({ id: 'policy-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-1', origin: 'policy-1' })
    );

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-2', origin: 'policy-1' })
    );
  });

  it('attaches when navigating to an action policy while an existing conversation is open', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    focusedActionPolicyService.setFocusedActionPolicy(createPolicy({ id: 'policy-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'policy-1' }));
  });

  it('attaches a different focused action policy after the conversation has started', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedActionPolicyService.setFocusedActionPolicy(createPolicy({ id: 'policy-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-1', origin: 'policy-1' })
    );

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-2', origin: 'policy-1' })
    );

    focusedActionPolicyService.setFocusedActionPolicy(createPolicy({ id: 'policy-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(3);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-2', origin: 'policy-2' })
    );
  });

  it('updates the same draft attachment when the focused action policy changes before send', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedActionPolicyService.setFocusedActionPolicy(createPolicy({ id: 'policy-1' }));
    jest.runOnlyPendingTimers();
    focusedActionPolicyService.setFocusedActionPolicy(createPolicy({ id: 'policy-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'draft-id-1', origin: 'policy-1' })
    );
    expect(addAttachment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'draft-id-1', origin: 'policy-2' })
    );
  });

  it('rotates the draft id after it is created in a completed round', () => {
    focusedActionPolicyService.setFocusedActionPolicy(createPolicy());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    chatEventsByConversationId.get('conversation-1')?.next(createRoundCompleteEvent('draft-id-1'));

    currentAppId$.next(null);
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'draft-id-3' }));
  });

  it('unsubscribes on cleanup', () => {
    cleanup();

    focusedActionPolicyService.setFocusedActionPolicy(createPolicy());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
