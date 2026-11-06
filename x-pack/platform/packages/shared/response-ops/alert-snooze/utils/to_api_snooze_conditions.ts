/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnoozeCondition as ApiSnoozeCondition } from '@kbn/response-ops-alerts-apis/types';
import { DataConditionType, type SnoozeCondition } from '../components/types';

const BUILT_IN_CONDITION_TYPES = new Set<string>(Object.values(DataConditionType));

const isApiSnoozeCondition = (condition: SnoozeCondition): condition is ApiSnoozeCondition =>
  BUILT_IN_CONDITION_TYPES.has(condition.type);

/**
 * Narrows the panel's open ended conditions to the built-in ones the snooze API
 * accepts, dropping any type a consumer registered through its own descriptor.
 */
export const toApiSnoozeConditions = (conditions: SnoozeCondition[] = []): ApiSnoozeCondition[] =>
  conditions.filter(isApiSnoozeCondition);
