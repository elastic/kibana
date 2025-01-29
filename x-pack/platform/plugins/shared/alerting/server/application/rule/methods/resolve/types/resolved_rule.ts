/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Rule } from '../../../types';

// @ts-expect-error upgrade typescript v4.9.5
export type ResolvedRule<Params> = Rule<Params> & { outcome: string; alias_target_id?: string };
