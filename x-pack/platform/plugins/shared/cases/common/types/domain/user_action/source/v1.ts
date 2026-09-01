/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject } from 'lodash';
import * as rt from 'io-ts';

export const ActionSourceTypes = {
  agent: 'agent',
  workflow: 'workflow',
  rule: 'rule',
  attack: 'attack',
  api: 'api',
  user: 'user',
} as const;

export const ActionSourceTypeRt = rt.keyof(ActionSourceTypes);
export type ActionSourceType = rt.TypeOf<typeof ActionSourceTypeRt>;

/** Source types shown as "via …" on the activity header. `user` is filter-only. */
export const ACTION_SOURCE_HEADER_TYPES: ReadonlySet<ActionSourceType> = new Set([
  ActionSourceTypes.agent,
  ActionSourceTypes.workflow,
  ActionSourceTypes.rule,
  ActionSourceTypes.attack,
  ActionSourceTypes.api,
]);

export const ActionSourceRt = rt.intersection([
  rt.strict({
    type: ActionSourceTypeRt,
    id: rt.string,
  }),
  rt.exact(
    rt.partial({
      name: rt.string,
      run_id: rt.string,
    })
  ),
]);

export type ActionSource = rt.TypeOf<typeof ActionSourceRt>;

export const isActionSource = (value: unknown): value is ActionSource => {
  if (!isPlainObject(value)) {
    return false;
  }

  const candidate = value as { type?: unknown; id?: unknown; name?: unknown; run_id?: unknown };
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    ActionSourceTypeRt.is(candidate.type) &&
    (candidate.name === undefined || typeof candidate.name === 'string') &&
    (candidate.run_id === undefined || typeof candidate.run_id === 'string')
  );
};

export const isHeaderActionSource = (value: unknown): value is ActionSource =>
  isActionSource(value) && ACTION_SOURCE_HEADER_TYPES.has(value.type);

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
}): ActionSource => ({
  type,
  id,
  ...(name ? { name } : {}),
  ...(runId ? { run_id: runId } : {}),
});
