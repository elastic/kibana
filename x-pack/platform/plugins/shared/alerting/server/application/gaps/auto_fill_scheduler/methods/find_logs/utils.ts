/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IValidatedEventInternalDocInfo } from '@kbn/event-log-plugin/server';
import type { GapAutoFillSchedulerLogEntry } from './types';

export const formatGapAutoFillSchedulerLogEntry = (
  entry: IValidatedEventInternalDocInfo
): GapAutoFillSchedulerLogEntry => {
  const execution = entry.kibana?.gap_auto_fill?.execution;
  const executionResults = execution?.results ?? [];

  return {
    id: entry._id,
    timestamp: entry['@timestamp'],
    status: execution?.status,
    message: entry.message,
    results: executionResults?.map((resultItem) => ({
      ruleId: resultItem.rule_id,
      processedGaps: resultItem.processed_gaps ? Number(resultItem.processed_gaps) : undefined,
      status: resultItem.status,
      error: resultItem.error,
    })),
  };
};
