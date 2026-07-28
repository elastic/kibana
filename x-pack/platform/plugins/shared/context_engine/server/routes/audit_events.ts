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
  CREATE_OR_UPDATE = 'ai_index_create_or_update',
  GET = 'ai_index_get',
  LIST = 'ai_index_list',
  DELETE = 'ai_index_delete',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<AiIndexAuditAction, VerbsTuple> = {
  ai_index_create: ['create', 'creating', 'created'],
  ai_index_create_or_update: ['create or update', 'creating or updating', 'created or updated'],
  ai_index_get: ['access', 'accessing', 'accessed'],
  ai_index_list: ['access', 'accessing', 'accessed'],
  ai_index_delete: ['delete', 'deleting', 'deleted'],
};

const eventTypes: Record<AiIndexAuditAction, string> = {
  ai_index_create: 'change',
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
