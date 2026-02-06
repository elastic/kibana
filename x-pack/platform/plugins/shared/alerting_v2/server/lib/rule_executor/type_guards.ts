/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulePipelineState } from './types';

type OptionalStateKey = keyof Omit<RulePipelineState, 'input'>;

export type StateWith<K extends OptionalStateKey> = RulePipelineState & {
  [P in K]: NonNullable<RulePipelineState[P]>;
};

export function hasState<K extends OptionalStateKey>(
  state: RulePipelineState,
  keys: readonly K[]
): state is StateWith<K> {
  return keys.every((key) => state[key] !== undefined);
}
