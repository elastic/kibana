/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { HttpStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { ChatEventType } from '@kbn/agent-builder-common/chat/events';
import type { RuleExecutionView } from '@kbn/alerting-v2-schemas';
import { buildRuleDiagnosisContext } from './build_rule_diagnosis_handoff';
import {
  diagnoseHandoffErrorToastTitle,
  openRuleFailureDiagnosisChat,
} from './open_rule_failure_diagnosis_chat';

const execution: RuleExecutionView = {
  id: 'exec-1',
  rule: { id: 'rule-1' },
  started_at: '2026-11-09T16:00:00.000Z',
  ended_at: '2026-11-09T16:00:01.000Z',
  timings: { duration_ms: 1000, scheduled_delay_ms: 0 },
  outcome: 'failure',
  error: { message: 'Unknown column [nonexistent_field]' },
};

const context = buildRuleDiagnosisContext({ execution, ruleName: 'My rule' });

describe('openRuleFailureDiagnosisChat', () => {
  let chat$: Subject<unknown>;
  const openChat = jest.fn();
  const httpPost = jest.fn();

  const render = () =>
    openRuleFailureDiagnosisChat({
      agentBuilder: { openChat, events: { chat$ } } as unknown as AgentBuilderPluginStart,
      http: { post: httpPost } as unknown as HttpStart,
      context,
    });

  beforeEach(() => {
    chat$ = new Subject();
    openChat.mockReset();
    httpPost.mockReset();
    httpPost.mockResolvedValue({});
  });

  it('opens a new conversation with attachments and auto-sends the skill-invoking prompt', () => {
    render();

    expect(openChat).toHaveBeenCalledTimes(1);
    const args = openChat.mock.calls[0][0];
    expect(args.newConversation).toBe(true);
    expect(args.autoSendInitialMessage).toBe(true);
    expect(args.sessionTag).toBe('rule-execution-diagnose:exec-1');
    expect(args.initialMessage).toContain('skill://universal-alerting-failure-diagnosis');
    expect(args.initialMessage).toContain('My rule');
    expect(args.initialMessage).not.toContain('nonexistent_field');
    expect(args.attachments).toHaveLength(1);
    expect(args.attachments[0].type).toBe('group');
  });

  it('renames the conversation once its id is set, then stops listening', () => {
    render();

    chat$.next({ type: ChatEventType.conversationIdSet, data: { conversation_id: 'conv-1' } });
    chat$.next({ type: ChatEventType.conversationCreated, data: { conversation_id: 'conv-2' } });

    expect(httpPost).toHaveBeenCalledTimes(1);
    expect(httpPost).toHaveBeenCalledWith('/internal/agent_builder/conversations/conv-1/_rename', {
      body: JSON.stringify({ title: 'Diagnose: My rule — 2026-11-09T16:00:00.000Z' }),
    });
  });

  it('also renames when the conversation-created event arrives first', () => {
    render();

    chat$.next({ type: ChatEventType.conversationCreated, data: { conversation_id: 'conv-9' } });

    expect(httpPost).toHaveBeenCalledWith(
      '/internal/agent_builder/conversations/conv-9/_rename',
      expect.any(Object)
    );
  });

  it('ignores a failed rename (best-effort)', async () => {
    httpPost.mockRejectedValue(new Error('rename failed'));
    render();

    expect(() =>
      chat$.next({ type: ChatEventType.conversationIdSet, data: { conversation_id: 'conv-1' } })
    ).not.toThrow();
    await Promise.resolve();
  });

  it('does not rename for unrelated chat events', () => {
    render();

    chat$.next({ type: 'something_else', data: {} });

    expect(httpPost).not.toHaveBeenCalled();
  });
});

describe('diagnoseHandoffErrorToastTitle', () => {
  it('reuses the workflows wording', () => {
    expect(diagnoseHandoffErrorToastTitle()).toBe('Unable to start AI diagnosis');
  });
});
