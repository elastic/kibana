/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEvent } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin/server';
import type { ArrayElement } from '@kbn/utility-types';

export enum AUDIT_TYPE {
  CREATION = 'creation',
  CHANGE = 'change',
  DELETION = 'deletion',
}

export enum AUDIT_CATEGORY {
  DATABASE = 'database',
}

export enum AUDIT_OUTCOME {
  FAILURE = 'failure',
  SUCCESS = 'success',
  UNKNOWN = 'unknown',
}

export enum AgentBuilderAuditAction {
  AGENT_CREATE = 'agent_builder_agent_create',
  AGENT_UPDATE = 'agent_builder_agent_update',
  AGENT_DELETE = 'agent_builder_agent_delete',
  TOOL_CREATE = 'agent_builder_tool_create',
  TOOL_UPDATE = 'agent_builder_tool_update',
  TOOL_DELETE = 'agent_builder_tool_delete',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<AgentBuilderAuditAction, VerbsTuple> = {
  [AgentBuilderAuditAction.AGENT_CREATE]: ['create', 'creating', 'created'],
  [AgentBuilderAuditAction.AGENT_UPDATE]: ['update', 'updating', 'updated'],
  [AgentBuilderAuditAction.AGENT_DELETE]: ['delete', 'deleting', 'deleted'],
  [AgentBuilderAuditAction.TOOL_CREATE]: ['create', 'creating', 'created'],
  [AgentBuilderAuditAction.TOOL_UPDATE]: ['update', 'updating', 'updated'],
  [AgentBuilderAuditAction.TOOL_DELETE]: ['delete', 'deleting', 'deleted'],
};

const eventTypes: Record<AgentBuilderAuditAction, ArrayElement<EcsEvent['type']> | undefined> = {
  [AgentBuilderAuditAction.AGENT_CREATE]: AUDIT_TYPE.CREATION,
  [AgentBuilderAuditAction.AGENT_UPDATE]: AUDIT_TYPE.CHANGE,
  [AgentBuilderAuditAction.AGENT_DELETE]: AUDIT_TYPE.DELETION,
  [AgentBuilderAuditAction.TOOL_CREATE]: AUDIT_TYPE.CREATION,
  [AgentBuilderAuditAction.TOOL_UPDATE]: AUDIT_TYPE.CHANGE,
  [AgentBuilderAuditAction.TOOL_DELETE]: AUDIT_TYPE.DELETION,
};

interface CommonAuditEventParams {
  action: AgentBuilderAuditAction;
  outcome?: EcsEvent['outcome'];
  error?: Error;
}

export interface AgentAuditEventParams extends CommonAuditEventParams {
  agentId?: string;
  agentName?: string;
}

export function agentAuditEvent({
  action,
  agentId,
  agentName,
  outcome,
  error,
}: AgentAuditEventParams): AuditEvent {
  let doc = 'an agent';
  if (agentId && agentName) {
    doc = `agent [id=${agentId}, name="${agentName}"]`;
  } else if (agentId) {
    doc = `agent [id=${agentId}]`;
  } else if (agentName) {
    doc = `agent [name="${agentName}"]`;
  }

  const [present, progressive, past] = eventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;

  const type = eventTypes[action];

  return {
    message,
    event: {
      action,
      category: [AUDIT_CATEGORY.DATABASE],
      type: type ? [type] : undefined,
      outcome: outcome ?? (error ? AUDIT_OUTCOME.FAILURE : AUDIT_OUTCOME.SUCCESS),
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}

export interface ToolAuditEventParams extends CommonAuditEventParams {
  toolId?: string;
  toolType?: string;
}

export function toolAuditEvent({
  action,
  toolId,
  toolType,
  outcome,
  error,
}: ToolAuditEventParams): AuditEvent {
  let doc = 'a tool';
  if (toolId && toolType) {
    doc = `tool [id=${toolId}, type=${toolType}]`;
  } else if (toolId) {
    doc = `tool [id=${toolId}]`;
  } else if (toolType) {
    doc = `tool [type=${toolType}]`;
  }

  const [present, progressive, past] = eventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;

  const type = eventTypes[action];

  return {
    message,
    event: {
      action,
      category: [AUDIT_CATEGORY.DATABASE],
      type: type ? [type] : undefined,
      outcome: outcome ?? (error ? AUDIT_OUTCOME.FAILURE : AUDIT_OUTCOME.SUCCESS),
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}
