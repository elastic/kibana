/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  budgetingMethodSchema,
  groupSummarySchema,
  objectiveSchema,
  timeWindowTypeSchema,
} from '../schema';

type BudgetingMethod = t.OutputOf<typeof budgetingMethodSchema>;
type TimeWindowType = t.OutputOf<typeof timeWindowTypeSchema>;
type GroupSummary = t.TypeOf<typeof groupSummarySchema>;
type Objective = t.OutputOf<typeof objectiveSchema>;

export type { BudgetingMethod, Objective, TimeWindowType, GroupSummary };
