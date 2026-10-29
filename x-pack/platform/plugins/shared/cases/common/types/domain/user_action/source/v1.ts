/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import { z } from '@kbn/zod/v4';
import { MAX_ACTION_SOURCE_NAME_LENGTH } from '../../../../constants';

export const ActionSourceTypes = {
  agent: 'agent',
  workflow: 'workflow',
  rule: 'rule',
  attack: 'attack',
  api: 'api',
  user: 'user',
} as const;

export const ActionSourceTypeSchema = z.enum([
  ActionSourceTypes.agent,
  ActionSourceTypes.workflow,
  ActionSourceTypes.rule,
  ActionSourceTypes.attack,
  ActionSourceTypes.api,
  ActionSourceTypes.user,
]);
export type ActionSourceType = z.infer<typeof ActionSourceTypeSchema>;

/** Source types shown as "via …" on the activity header. `user` is filter-only. */
export const ACTION_SOURCE_HEADER_TYPES: ReadonlySet<ActionSourceType> = new Set([
  ActionSourceTypes.agent,
  ActionSourceTypes.workflow,
  ActionSourceTypes.rule,
  ActionSourceTypes.attack,
  ActionSourceTypes.api,
]);

export const ActionSourceSchema = z.object({
  type: ActionSourceTypeSchema,
  id: z.string(),
  name: z.string().optional(),
  run_id: z.string().optional(),
});

export type ActionSource = z.infer<typeof ActionSourceSchema>;

export const isActionSource = (value: unknown): value is ActionSource => {
  if (!isPlainObject(value)) {
    return false;
  }

  const candidate = value as { type?: unknown; id?: unknown; name?: unknown; run_id?: unknown };
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    ActionSourceTypeSchema.safeParse(candidate.type).success &&
    (candidate.name === undefined || typeof candidate.name === 'string') &&
    (candidate.run_id === undefined || typeof candidate.run_id === 'string')
  );
};

export const isHeaderActionSource = (value: unknown): value is ActionSource =>
  isActionSource(value) && ACTION_SOURCE_HEADER_TYPES.has(value.type);

const clampActionSourceName = (name?: string | null): string | undefined => {
  if (name == null) {
    return undefined;
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.length > MAX_ACTION_SOURCE_NAME_LENGTH
    ? trimmed.slice(0, MAX_ACTION_SOURCE_NAME_LENGTH)
    : trimmed;
};

export const toActionSource = ({
  type,
  id,
  name,
  runId,
}: {
  type: ActionSourceType;
  id: string;
  name?: string | null;
  runId?: string | null;
}): ActionSource => {
  const clampedName = clampActionSourceName(name);

  return {
    type,
    id,
    ...(clampedName ? { name: clampedName } : {}),
    ...(runId ? { run_id: runId } : {}),
  };
};
