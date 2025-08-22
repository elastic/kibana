/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { GapAutoFillSchedulerResponseBodyV1 } from '../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';

export const transformResponse = (
  result: SavedObject<Record<string, unknown>> | SavedObjectsUpdateResponse<Record<string, unknown>>
): GapAutoFillSchedulerResponseBodyV1 => {
  // For update operations, we might get either a SavedObject or SavedObjectsUpdateResponse
  // We'll handle both cases and return a consistent response format
  if ('attributes' in result) {
    // This is a SavedObject
    const attributes = result.attributes as Record<string, unknown>;
    return {
      id: result.id,
      name: attributes.name as string,
      enabled: attributes.enabled as boolean,
      schedule: attributes.schedule as { interval: string },
      rules_filter: attributes.rulesFilter as string,
      gap_fill_range: attributes.gapFillRange as string,
      max_amount_of_gaps_to_process_per_run: attributes.maxAmountOfGapsToProcessPerRun as number,
      max_amount_of_rules_to_process_per_run: attributes.maxAmountOfRulesToProcessPerRun as number,
      amount_of_retries: attributes.amountOfRetries as number,
      created_by: attributes.createdBy as string | undefined,
      updated_by: attributes.updatedBy as string | undefined,
      created_at: attributes.createdAt as string,
      updated_at: attributes.updatedAt as string,
      last_run: attributes.lastRun as string | null | undefined,
      scheduled_task_id: attributes.scheduledTaskId as string,
    };
  } else {
    // This is a SavedObjectsUpdateResponse
    const attributes = result.attributes as Record<string, unknown>;
    return {
      id: result.id,
      name: attributes.name as string,
      enabled: attributes.enabled as boolean,
      schedule: attributes.schedule as { interval: string },
      rules_filter: attributes.rulesFilter as string,
      gap_fill_range: attributes.gapFillRange as string,
      max_amount_of_gaps_to_process_per_run: attributes.maxAmountOfGapsToProcessPerRun as number,
      max_amount_of_rules_to_process_per_run: attributes.maxAmountOfRulesToProcessPerRun as number,
      amount_of_retries: attributes.amountOfRetries as number,
      created_by: attributes.createdBy as string | undefined,
      updated_by: attributes.updatedBy as string | undefined,
      created_at: attributes.createdAt as string,
      updated_at: attributes.updatedAt as string,
      last_run: attributes.lastRun as string | null | undefined,
      scheduled_task_id: attributes.scheduledTaskId as string,
    };
  }
};
