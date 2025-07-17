/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { findGapsSearchAfter } from './find_gaps';
import type { Gap } from './gap';
import type { GapStatus } from '../../../common/constants';
import { gapStatus } from '../../../common/constants';

interface ProcessAllRuleGapsParams<T> {
  ruleId: string;
  start?: string;
  end?: string;
  statuses?: GapStatus[];
  options?: {
    maxFetchedGaps?: number;
  };
  eventLogClient: IEventLogClient;
  logger: Logger;
  processGapsBatch: (gaps: Gap[]) => Promise<T>;
}

export const PROCESS_GAPS_DEFAULT_PAGE_SIZE = 500;
// Circuit breaker to prevent infinite loops
// It should be enough to update 5,000,000 gaps
// 10000 * 500 = 5,000,000 million gaps
const DEFAULT_MAX_ITERATIONS = 10000;

/**
 * Fetches all gaps using search_after pagination to process more than 10,000 gaps with stable sorting
 */
export const processAllRuleGaps = async <T>({
  ruleId,
  start,
  end,
  statuses = [gapStatus.PARTIALLY_FILLED, gapStatus.UNFILLED],
  options,
  logger,
  eventLogClient,
  processGapsBatch,
}: ProcessAllRuleGapsParams<T>): Promise<T[]> => {
  let searchAfter: SortResults[] | undefined;
  let pitId: string | undefined;
  let iterationCount = 0;
  let gapsCount = 0;
  const processingResults: T[] = [];

  const { maxFetchedGaps } = options ?? {};

  try {
    while (true) {
      if (iterationCount >= DEFAULT_MAX_ITERATIONS) {
        logger.warn(
          `Circuit breaker triggered: Reached maximum number of iterations (${DEFAULT_MAX_ITERATIONS}) while processing gaps for rule ${ruleId}`
        );
        break;
      }
      iterationCount++;

      const gapsResponse = await findGapsSearchAfter({
        eventLogClient,
        logger,
        params: {
          ruleId,
          start,
          end,
          perPage: PROCESS_GAPS_DEFAULT_PAGE_SIZE,
          statuses,
          sortField: '@timestamp',
          sortOrder: 'asc',
          searchAfter,
          pitId,
        },
      });

      const { data: gaps, searchAfter: nextSearchAfter, pitId: nextPitId } = gapsResponse;
      pitId = nextPitId;

      gapsCount += gaps.length;

      let gapsToProcess = gaps;
      if (maxFetchedGaps && gapsCount > maxFetchedGaps) {
        const offset = gapsCount - maxFetchedGaps;
        gapsToProcess = gapsToProcess.slice(0, gaps.length - offset);
      }

      if (gapsToProcess.length > 0) {
        processingResults.push(await processGapsBatch(gapsToProcess));
      }

      // Exit conditions: no more results or no next search_after or maxFetchedGaps reached
      const maxGapsReached = maxFetchedGaps !== undefined && gapsCount >= maxFetchedGaps;
      if (gapsToProcess.length === 0 || !nextSearchAfter || maxGapsReached) {
        break;
      }

      searchAfter = nextSearchAfter;
    }
  } finally {
    if (pitId) {
      await eventLogClient.closePointInTime(pitId);
    }
  }

  return processingResults;
};
