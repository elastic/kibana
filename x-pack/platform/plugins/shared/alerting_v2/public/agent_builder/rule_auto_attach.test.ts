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
import { RULE_ATTACHMENT_TYPE } from '@kbn/alerting-v2-schemas';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/public';
import type { RuleApiResponse } from '../services/rules_api';
import { FocusedRuleService } from '../services/focused_rule_service';
import { registerRuleAutoAttach, type IdGenerator } from './rule_auto_attach';

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

const createVersionedAttachment = (id: string): VersionedAttachment => ({
  id,
  type: RULE_ATTACHMENT_TYPE,
  versions: [
    {
      version: 1,
      data: createRule(),
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

describe('registerRuleAutoAttach', () => {
  let currentAppId$: BehaviorSubject<string | null>;
  let activeConversation$: BehaviorSubject<ActiveConversation | null>;
  let focusedRuleService: FocusedRuleService;
  let addAttachment: jest.Mock;
  let draftAttachmentId: IdGenerator;
  let cleanup: () => void;
  let chatEventsByConversationId: Map<string, Subject<ChatEvent>>;

  beforeEach(() => {
    jest.useFakeTimers();
    currentAppId$ = new BehaviorSubject<string | null>(null);
    activeConversation$ = new BehaviorSubject<ActiveConversation | null>(null);
    focusedRuleService = new FocusedRuleService();
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

    cleanup = registerRuleAutoAttach({
      agentBuilder,
      chrome,
      focusedRuleService,
      draftAttachmentId,
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('does not attach when the Agent Builder sidebar is closed', () => {
    focusedRuleService.setFocusedRule(createRule());
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('attaches the focused rule to a new conversation draft when chat is open', () => {
    const rule = createRule();

    focusedRuleService.setFocusedRule(rule);
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith({
      id: 'draft-id-1',
      type: RULE_ATTACHMENT_TYPE,
      origin: 'rule-1',
      data: rule,
    });
  });

  it('attaches the focused rule when an existing conversation becomes active', () => {
    focusedRuleService.setFocusedRule(createRule());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'rule-1' }));
  });

  it('restages the focused rule with a new draft id after the conversation is persisted', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedRuleService.setFocusedRule(createRule({ id: 'rule-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-1', origin: 'rule-1' })
    );

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-2', origin: 'rule-1' })
    );
  });

  it('attaches when navigating to a rule while an existing conversation is open', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();

    focusedRuleService.setFocusedRule(createRule({ id: 'rule-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledWith(expect.objectContaining({ origin: 'rule-1' }));
  });

  it('attaches a different focused rule after the conversation has started', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    focusedRuleService.setFocusedRule(createRule({ id: 'rule-1' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-1', origin: 'rule-1' })
    );

    activeConversation$.next({ id: 'conversation-1', conversation: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-2', origin: 'rule-1' })
    );

    focusedRuleService.setFocusedRule(createRule({ id: 'rule-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(3);
    expect(addAttachment).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'draft-id-2', origin: 'rule-2' })
    );
  });

  it('updates the same draft attachment when the focused rule changes before send', () => {
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });

    focusedRuleService.setFocusedRule(createRule({ id: 'rule-1' }));
    jest.runOnlyPendingTimers();
    focusedRuleService.setFocusedRule(createRule({ id: 'rule-2' }));
    jest.runOnlyPendingTimers();

    expect(addAttachment).toHaveBeenCalledTimes(2);
    expect(addAttachment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'draft-id-1', origin: 'rule-1' })
    );
    expect(addAttachment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'draft-id-1', origin: 'rule-2' })
    );
  });

  it('rotates the draft id after it is created in a completed round', () => {
    focusedRuleService.setFocusedRule(createRule());
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

    focusedRuleService.setFocusedRule(createRule());
    currentAppId$.next(AGENTBUILDER_FEATURE_ID);
    activeConversation$.next({ id: undefined });
    jest.runOnlyPendingTimers();

    expect(addAttachment).not.toHaveBeenCalled();
  });
});
