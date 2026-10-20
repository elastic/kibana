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
  RESTORE = 'ai_index_ki_restore',
  KI_UPDATE = 'ai_index_ki_update',
  KI_DELETE = 'ai_index_ki_delete',
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
  ai_index_ki_restore: ['restore', 'restoring', 'restored'],
  ai_index_ki_update: ['update', 'updating', 'updated'],
  ai_index_ki_delete: ['delete', 'deleting', 'deleted'],
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
  ai_index_ki_restore: 'change',
  ai_index_ki_update: 'change',
  ai_index_ki_delete: 'deletion',
  ai_index_delete_resources: 'deletion',
  ai_index_query: 'access',
  ai_index_describe: 'access',
};

export interface AiIndexAuditEventParams {
  action: AiIndexAuditAction;
  id?: string;
  kiId?: string;
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
  kiId,
  outcome,
  error,
}: AiIndexAuditEventParams): AuditEvent => {
  let doc: string;
  if (kiId) {
    doc = `Knowledge Indicator [id=${kiId}] of AI index [id=${id}]`;
  } else if (id) {
    doc = `AI index [id=${id}]`;
  } else {
    doc = 'an AI index';
  }

  const savedObject =
    !kiId || !id ? { type: kiId ? 'ki' : 'ai_index', id: kiId ?? id ?? '' } : undefined;

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
