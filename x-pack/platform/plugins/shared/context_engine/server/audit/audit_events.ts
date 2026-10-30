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
  KI_RESTORE = 'ki_restore',
  KI_UPDATE = 'ki_update',
  KI_DELETE = 'ki_delete',
  DELETE_RESOURCES = 'ai_index_delete_resources',
  QUERY = 'ai_index_query',
  DESCRIBE = 'ai_index_describe',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<AiIndexAuditAction, VerbsTuple> = {
  ai_index_create: ['create', 'creating', 'created'],
  ai_index_update: ['update', 'updating', 'updated'],
  ai_index_create_or_update: ['create or update', 'creating or updating', 'created or updated'],
  ai_index_get: ['access', 'accessing', 'accessed'],
  ai_index_list: ['access', 'accessing', 'accessed'],
  ai_index_delete: ['delete', 'deleting', 'deleted'],
  ki_restore: ['restore', 'restoring', 'restored'],
  ki_update: ['update', 'updating', 'updated'],
  ki_delete: ['delete', 'deleting', 'deleted'],
  ai_index_delete_resources: [
    'delete related resources of',
    'deleting related resources of',
    'deleted related resources of',
  ],
  ai_index_query: ['query', 'querying', 'queried'],
  ai_index_describe: ['describe', 'describing', 'described'],
};

const eventTypes: Record<AiIndexAuditAction, string> = {
  ai_index_create: 'creation',
  ai_index_update: 'change',
  ai_index_create_or_update: 'change',
  ai_index_get: 'access',
  ai_index_list: 'access',
  ai_index_delete: 'deletion',
  ki_restore: 'change',
  ki_update: 'change',
  ki_delete: 'deletion',
  ai_index_delete_resources: 'deletion',
  ai_index_query: 'access',
  ai_index_describe: 'access',
};

type AiIndexOnlyAuditAction = Exclude<
  AiIndexAuditAction,
  AiIndexAuditAction.KI_UPDATE | AiIndexAuditAction.KI_DELETE | AiIndexAuditAction.KI_RESTORE
>;

export type KiAuditAction =
  | AiIndexAuditAction.KI_UPDATE
  | AiIndexAuditAction.KI_DELETE
  | AiIndexAuditAction.KI_RESTORE;

export interface AiIndexAuditEventParams {
  action: AiIndexOnlyAuditAction;
  id?: string;
  outcome?: EcsEvent['outcome'];
  error?: Error;
}

export interface KiAuditEventParams {
  action: KiAuditAction;
  aiIndexId: string;
  kiId: string;
  outcome?: EcsEvent['outcome'];
  error?: Error;
}

export enum ImprovementAuditAction {
  RECORD = 'context_engine_improvement_record',
}

export interface ImprovementAuditEventParams {
  aiIndexId: string;
  /** How many proposals the run recorded; absent on a failed attempt. */
  recorded?: number;
  error?: Error;
}

interface AuditEventBodyParams {
  action: AiIndexAuditAction;
  doc: string;
  savedObject?: { type: string; id: string };
  outcome?: EcsEvent['outcome'];
  error?: Error;
}

const auditEventBody = ({
  action,
  doc,
  savedObject,
  outcome,
  error,
}: AuditEventBodyParams): AuditEvent => {
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
      saved_object: savedObject,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
};

/** Audits an analysis run recording what it proposed. */
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
  return auditEventBody({
    action,
    doc,
    savedObject: id ? { type: 'ai_index', id } : undefined,
    outcome,
    error,
  });
};

export const kiAuditEvent = ({
  action,
  aiIndexId,
  kiId,
  outcome,
  error,
}: KiAuditEventParams): AuditEvent =>
  auditEventBody({
    action,
    doc: `Knowledge Indicator [id=${kiId}] of AI index [id=${aiIndexId}]`,
    savedObject: { type: 'ki', id: kiId },
    outcome,
    error,
  });
