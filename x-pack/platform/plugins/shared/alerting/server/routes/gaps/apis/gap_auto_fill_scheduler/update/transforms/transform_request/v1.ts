/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import type { UpdateGapFillAutoSchedulerParams } from '../../../../../../application/rule/methods/update_gap_fill_auto_scheduler/types';

export const transformRequest = (id: string, updates: any): { id: string; updates: UpdateGapFillAutoSchedulerParams } => ({
  id,
  updates: {
    schedule: updates.schedule,
    name: updates.name,
    maxAmountOfGapsToProcessPerRun: updates.max_amount_of_gaps_to_process_per_run,
    maxAmountOfRulesToProcessPerRun: updates.max_amount_of_rules_to_process_per_run,
    amountOfRetries: updates.amount_of_retries,
    rulesFilter: updates.rules_filter,
    gapFillRange: updates.gap_fill_range,
    enabled: updates.enabled,
  },
});
