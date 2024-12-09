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
  statusSchema,
  timeWindowTypeSchema,
} from '../schema';

type BudgetingMethod = t.OutputOf<typeof budgetingMethodSchema>;
type TimeWindowType = t.OutputOf<typeof timeWindowTypeSchema>;
type GroupSummary = t.TypeOf<typeof groupSummarySchema>;
type Objective = t.OutputOf<typeof objectiveSchema>;
type Status = t.OutputOf<typeof statusSchema>;

export type { BudgetingMethod, Objective, Status, TimeWindowType, GroupSummary };
