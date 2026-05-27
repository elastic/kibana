import type * as t from 'io-ts';
import type { budgetingMethodSchema, groupSummarySchema, objectiveSchema, statusSchema, timeWindowTypeSchema } from '../schema';
type BudgetingMethod = t.OutputOf<typeof budgetingMethodSchema>;
type TimeWindowType = t.OutputOf<typeof timeWindowTypeSchema>;
type GroupSummary = t.TypeOf<typeof groupSummarySchema>;
type Objective = t.OutputOf<typeof objectiveSchema>;
type Status = t.OutputOf<typeof statusSchema>;
export type { BudgetingMethod, GroupSummary, Objective, Status, TimeWindowType };
