/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditEvent } from '@kbn/core-security-server';
import type { EcsEvent } from '@kbn/core/server';

export enum AiIndexAuditAction {
  CREATE = 'ai_index_create',
  UPDATE = 'ai_index_update',
  CREATE_OR_UPDATE = 'ai_index_create_or_update',
  GET = 'ai_index_get',
  LIST = 'ai_index_list',
  DELETE = 'ai_index_delete',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<AiIndexAuditAction, VerbsTuple> = {
  ai_index_create: ['create', 'creating', 'created'],
  ai_index_update: ['update', 'updating', 'updated'],
  ai_index_create_or_update: ['create or update', 'creating or updating', 'created or updated'],
  ai_index_get: ['access', 'accessing', 'accessed'],
  ai_index_list: ['access', 'accessing', 'accessed'],
  ai_index_delete: ['delete', 'deleting', 'deleted'],
};

const eventTypes: Record<AiIndexAuditAction, string> = {
  ai_index_create: 'creation',
  ai_index_update: 'change',
  ai_index_create_or_update: 'change',
  ai_index_get: 'access',
  ai_index_list: 'access',
  ai_index_delete: 'deletion',
};

export interface AiIndexAuditEventParams {
  action: AiIndexAuditAction;
  id?: string;
  outcome?: EcsEvent['outcome'];
  error?: Error;
}

export enum ImprovementAuditAction {
  RECORD = 'context_engine_improvement_record',
  APPROVE = 'context_engine_improvement_approve',
  REJECT = 'context_engine_improvement_reject',
  RUN = 'context_engine_feedback_analysis_run',
}

export interface ImprovementDecisionAuditEventParams {
  action:
    | ImprovementAuditAction.APPROVE
    | ImprovementAuditAction.REJECT
    | ImprovementAuditAction.RUN;
  aiIndexId: string;
  /** Absent for a run, which decides nothing. */
  improvementId?: string;
  error?: Error;
}

const DECISION_VERB: Record<
  ImprovementDecisionAuditEventParams['action'],
  { attempt: string; done: string }
> = {
  [ImprovementAuditAction.APPROVE]: { attempt: 'approve', done: 'approved' },
  [ImprovementAuditAction.REJECT]: { attempt: 'reject', done: 'rejected' },
  [ImprovementAuditAction.RUN]: {
    attempt: 'run feedback analysis for',
    done: 'run feedback analysis for',
  },
};

/**
 * Audits a reviewer approving or rejecting a proposal, or starting a run by hand.
 *
 * Approving is the point at which the loop is allowed to change something, so the decision and its
 * outcome are both privileged mutations worth a record of their own — `RECORD` above covers only
 * what a run proposed, which changes nothing on its own.
 */
export const improvementDecisionAuditEvent = ({
  action,
  aiIndexId,
  improvementId,
  error,
}: ImprovementDecisionAuditEventParams): AuditEvent => {
  const subject = improvementId
    ? `improvement [id=${improvementId}] on AI index [id=${aiIndexId}]`
    : `AI index [id=${aiIndexId}]`;

  return {
    message: error
      ? `Failed attempt to ${DECISION_VERB[action].attempt} ${subject}`
      : `User has ${DECISION_VERB[action].done} ${subject}`,
    event: {
      action,
      category: ['database'],
      type: [action === ImprovementAuditAction.RUN ? 'access' : 'change'],
      outcome: error ? 'failure' : 'success',
    },
    kibana: {
      saved_object: { type: 'ai_index', id: aiIndexId },
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
};

export interface ImprovementAuditEventParams {
  aiIndexId: string;
  /** How many proposals the run actually recorded; absent on a failed attempt. */
  recorded?: number;
  error?: Error;
}

/**
 * Audits an analysis run recording what it proposed.
 *
 * Separate from {@link aiIndexAuditEvent} because the object is different: this writes to the
 * improvements store on behalf of a scheduled run, and the record a reviewer needs is which index
 * the run was for and how much it added, not which AI index document changed.
 */
export const improvementAuditEvent = ({
  aiIndexId,
  recorded,
  error,
}: ImprovementAuditEventParams): AuditEvent => ({
  message: error
    ? `Failed attempt to record improvements for AI index [id=${aiIndexId}]`
    : `User has recorded ${recorded ?? 0} improvement(s) for AI index [id=${aiIndexId}]`,
  event: {
    action: ImprovementAuditAction.RECORD,
    category: ['database'],
    type: ['creation'],
    outcome: error ? 'failure' : 'success',
  },
  kibana: {
    saved_object: { type: 'ai_index', id: aiIndexId },
  },
  error: error && {
    code: error.name,
    message: error.message,
  },
});

export const aiIndexAuditEvent = ({
  action,
  id,
  outcome,
  error,
}: AiIndexAuditEventParams): AuditEvent => {
  const doc = id ? `AI index [id=${id}]` : 'an AI index';
  const [present, progressive, past] = eventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;

  return {
    message,
    event: {
      action,
      category: ['database'],
      type: [eventTypes[action]],
      outcome: outcome ?? (error ? 'failure' : 'success'),
    },
    kibana: {
      saved_object: id ? { type: 'ai_index', id } : undefined,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
};
