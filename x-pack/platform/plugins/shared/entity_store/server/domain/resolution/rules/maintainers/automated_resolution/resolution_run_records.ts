/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ensureResolutionRunsDataStream,
  getResolutionRunsDataStreamName,
} from '../../../../asset_manager/resolution_runs_data_stream';
import type { PerRuleState } from './types';
import { readRunCounts } from './rule_run_counts';

/** Built-in rules are `managed`. Custom rules can be added later with `custom`, with no mapping change. */
export type ResolutionRunRuleKind = 'managed' | 'custom';

export interface ResolutionRunRecord {
  '@timestamp': string;
  rule: { id: string; kind: ResolutionRunRuleKind };
  event: { outcome: 'success' | 'failure' };
  error?: { message: string };
  resolution: {
    links_created: number;
    skipped_ambiguous: number;
    skipped_oversized: number;
    skipped_noop: number;
  };
}

const NO_COUNTS = {
  links_created: 0,
  skipped_ambiguous: 0,
  skipped_oversized: 0,
  skipped_noop: 0,
} as const;

/** One record for a rule run that finished without throwing. */
export const buildSuccessRecord = (
  ruleId: string,
  state: PerRuleState,
  now: number
): ResolutionRunRecord => ({
  '@timestamp': new Date(now).toISOString(),
  rule: { id: ruleId, kind: 'managed' },
  event: { outcome: 'success' },
  resolution: readRunCounts(state.lastRun) ?? NO_COUNTS,
});

/** One record for a rule run that threw. The error comes from the saved failure state. */
export const buildFailureRecord = (
  ruleId: string,
  failedState: PerRuleState,
  now: number
): ResolutionRunRecord => ({
  '@timestamp': new Date(now).toISOString(),
  rule: { id: ruleId, kind: 'managed' },
  event: { outcome: 'failure' },
  ...(typeof failedState.lastError === 'string' && { error: { message: failedState.lastError } }),
  resolution: NO_COUNTS,
});

/**
 * Writes the run records for one maintainer tick in a single bulk request. This is monitoring, so
 * it must never break resolution: any problem is logged as a warning and swallowed.
 */
export const writeResolutionRunRecords = async ({
  esClient,
  namespace,
  logger,
  records,
}: {
  esClient: ElasticsearchClient;
  namespace: string;
  logger: Logger;
  records: readonly ResolutionRunRecord[];
}): Promise<void> => {
  if (records.length === 0) {
    return;
  }
  try {
    // The stream must exist before the first write, or Elasticsearch creates a plain index that
    // takes its name. This also covers installs that pre-date the stream.
    await ensureResolutionRunsDataStream(esClient, namespace, logger);
    const index = getResolutionRunsDataStreamName(namespace);
    const response = await esClient.bulk({
      operations: records.flatMap((record) => [{ create: { _index: index } }, record]),
      refresh: false,
    });
    if (response.errors) {
      const failed = response.items.filter((item) => item.create?.error).length;
      logger.warn(`Could not write ${failed} of ${records.length} resolution run records`);
    }
  } catch (error) {
    logger.warn(`Could not write resolution run records: ${error}`);
  }
};
