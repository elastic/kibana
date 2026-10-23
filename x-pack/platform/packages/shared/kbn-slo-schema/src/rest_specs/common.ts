/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  budgetingMethodSchema,
  groupSummarySchema,
  objectiveSchema,
  statusSchema,
  timeWindowTypeSchema,
} from '../schema/zod';

type BudgetingMethod = z.input<typeof budgetingMethodSchema>;
type TimeWindowType = z.input<typeof timeWindowTypeSchema>;
type GroupSummary = z.output<typeof groupSummarySchema>;
type Objective = z.input<typeof objectiveSchema>;
type Status = z.input<typeof statusSchema>;

export type { BudgetingMethod, GroupSummary, Objective, Status, TimeWindowType };
