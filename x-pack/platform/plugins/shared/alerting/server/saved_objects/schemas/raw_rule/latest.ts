/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TypeOf } from '@kbn/config-schema';

import {
  rawRuleExecutionStatusSchema,
  rawRuleActionSchema,
  rawRuleAlertsFilterSchema,
  rawRuleLastRunSchema,
} from './v3';

import { rawRuleMonitoringSchema, rawRuleSchema } from './v4';

type Mutable<T> = { -readonly [P in keyof T]: T[P] extends object ? Mutable<T[P]> : T[P] };

export type RawRuleAction = Mutable<TypeOf<typeof rawRuleActionSchema>>;
export type RawRuleExecutionStatus = Mutable<TypeOf<typeof rawRuleExecutionStatusSchema>>;
export type RawRuleAlertsFilter = Mutable<TypeOf<typeof rawRuleAlertsFilterSchema>>;
export type RawRuleLastRun = Mutable<TypeOf<typeof rawRuleLastRunSchema>>;
export type RawRuleMonitoring = Mutable<TypeOf<typeof rawRuleMonitoringSchema>>;
export type RawRule = Mutable<TypeOf<typeof rawRuleSchema>>;
