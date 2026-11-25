/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoostRule } from './types';

/** Whether the rule is one of the project defaults, which can't be deleted. */
export const isDefaultRule = ({ is_builtin: isBuiltin }: Pick<BoostRule, 'is_builtin'>): boolean =>
  isBuiltin;
