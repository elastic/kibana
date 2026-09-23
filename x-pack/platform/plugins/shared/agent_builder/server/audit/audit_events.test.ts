/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AUDIT_CATEGORY,
  AUDIT_OUTCOME,
  AUDIT_TYPE,
  AgentBuilderAuditAction,
  agentAuditEvent,
  conversationAuditEvent,
  toolAuditEvent,
} from './audit_events';

describe('Agent Builder audit event builders', () => {
  describe('agentAuditEvent', () => {
    it('returns a creation audit event for agent create', () => {
      const event = agentAuditEvent({
        action: AgentBuilderAuditAction.AGENT_CREATE,
        agentId: 'my.awesome.agent',
        agentName: 'Threat Hunting Agent',
      });

      expect(event).toMatchObject({
        message: 'User has created agent [id=my.awesome.agent, name="Threat Hunting Agent"]',
        event: {
          action: AgentBuilderAuditAction.AGENT_CREATE,
          category: [AUDIT_CATEGORY.DATABASE],
          type: [AUDIT_TYPE.CREATION],
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });
    });

    it('returns a deletion audit event for agent delete with only the id', () => {
      const event = agentAuditEvent({
        action: AgentBuilderAuditAction.AGENT_DELETE,
        agentId: 'my.awesome.agent',
      });

      expect(event).toMatchObject({
        message: 'User has deleted agent [id=my.awesome.agent]',
        event: {
          action: AgentBuilderAuditAction.AGENT_DELETE,
          category: [AUDIT_CATEGORY.DATABASE],
          type: [AUDIT_TYPE.DELETION],
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });
    });

    it('returns a failure audit event when an error is provided', () => {
      const error = new Error('boom');
      const event = agentAuditEvent({
        action: AgentBuilderAuditAction.AGENT_UPDATE,
        agentId: 'my.awesome.agent',
        error,
      });

      expect(event).toMatchObject({
        message: 'Failed attempt to update agent [id=my.awesome.agent]',
        event: {
          action: AgentBuilderAuditAction.AGENT_UPDATE,
          category: [AUDIT_CATEGORY.DATABASE],
          type: [AUDIT_TYPE.CHANGE],
          outcome: AUDIT_OUTCOME.FAILURE,
        },
        error: {
          code: 'Error',
          message: 'boom',
        },
      });
    });
  });

  describe('toolAuditEvent', () => {
    it('returns a creation audit event for tool create', () => {
      const event = toolAuditEvent({
        action: AgentBuilderAuditAction.TOOL_CREATE,
        toolId: 'my.tool',
        toolType: 'esql',
      });

      expect(event).toMatchObject({
        message: 'User has created tool [id=my.tool, type=esql]',
        event: {
          action: AgentBuilderAuditAction.TOOL_CREATE,
          category: [AUDIT_CATEGORY.DATABASE],
          type: [AUDIT_TYPE.CREATION],
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });
    });

    it('returns a deletion audit event for tool delete with only the id', () => {
      const event = toolAuditEvent({
        action: AgentBuilderAuditAction.TOOL_DELETE,
        toolId: 'my.tool',
      });

      expect(event).toMatchObject({
        message: 'User has deleted tool [id=my.tool]',
        event: {
          action: AgentBuilderAuditAction.TOOL_DELETE,
          category: [AUDIT_CATEGORY.DATABASE],
          type: [AUDIT_TYPE.DELETION],
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });
    });
  });

  describe('conversationAuditEvent', () => {
    it('returns a creation audit event naming the conversation and its agent', () => {
      const event = conversationAuditEvent({
        action: AgentBuilderAuditAction.CONVERSATION_CREATE,
        conversationId: 'conv-1',
        agentId: 'agent-1',
      });

      expect(event).toMatchObject({
        message: 'User has created conversation [id=conv-1, agent=agent-1]',
        event: {
          action: AgentBuilderAuditAction.CONVERSATION_CREATE,
          category: [AUDIT_CATEGORY.DATABASE],
          type: [AUDIT_TYPE.CREATION],
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
      });
    });

    it('names a service account and carries it as fallback attribution', () => {
      const event = conversationAuditEvent({
        action: AgentBuilderAuditAction.CONVERSATION_CREATE,
        conversationId: 'conv-1',
        user: {
          id: 'service_account:kibana/automation',
          username: 'kibana/automation',
          type: 'service_account',
        },
      });

      expect(event.message).toBe('Service account has created conversation [id=conv-1]');
      expect(event.user).toEqual({
        id: 'service_account:kibana/automation',
        name: 'kibana/automation',
      });
    });

    it('records a failure when creation errored', () => {
      const event = conversationAuditEvent({
        action: AgentBuilderAuditAction.CONVERSATION_CREATE,
        conversationId: 'conv-1',
        error: new Error('nope'),
      });

      expect(event).toMatchObject({
        message: 'Failed attempt to create conversation [id=conv-1]',
        event: { outcome: AUDIT_OUTCOME.FAILURE },
        error: { message: 'nope' },
      });
    });
  });
});
