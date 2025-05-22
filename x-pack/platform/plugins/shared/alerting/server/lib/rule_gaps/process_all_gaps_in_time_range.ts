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

interface ProcessAllGapsInTimeRangeParams {
  ruleId: string;
  start: string;
  end: string;
  statuses?: GapStatus[];
  options?: {
    pageSize?: number;
    maxIterations?: number;
  };
  eventLogClient: IEventLogClient;
  logger: Logger;
  processGapsBatch: (gaps: Gap[]) => void;
}

const DEFAULT_PAGE_SIZE = 500;
// Circuit breaker to prevent infinite loops
// It should be enough to update 50,000,000 gaps
// 100000 * 500 = 50,000,000 millions gaps
const DEFAULT_MAX_ITERATIONS = 100000;

/**
 * Fetches all gaps using search_after pagination to process more than 10,000 gaps with stable sorting
 */
export const processAllGapsInTimeRange = async ({
  ruleId,
  start,
  end,
  statuses = [gapStatus.PARTIALLY_FILLED, gapStatus.UNFILLED],
  options,
  logger,
  eventLogClient,
  processGapsBatch,
}: ProcessAllGapsInTimeRangeParams) => {
  let searchAfter: SortResults[] | undefined;
  let pitId: string | undefined;
  let iterationCount = 0;

  const { pageSize = DEFAULT_PAGE_SIZE, maxIterations = DEFAULT_MAX_ITERATIONS } = options ?? {};

  try {
    while (true) {
      if (iterationCount >= maxIterations) {
        logger.warn(
          `Circuit breaker triggered: Reached maximum number of iterations (${maxIterations}) while processing gaps for rule ${ruleId}`
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
          perPage: pageSize,
          statuses,
          sortField: '@timestamp',
          sortOrder: 'asc',
          searchAfter,
          pitId,
        },
      });

      const { data: gaps, searchAfter: nextSearchAfter, pitId: nextPitId } = gapsResponse;
      pitId = nextPitId;

      await processGapsBatch(gaps);

      // Exit conditions: no more results or no next search_after
      if (gaps.length === 0 || !nextSearchAfter) {
        break;
      }

      searchAfter = nextSearchAfter;
    }
  } finally {
    if (pitId) {
      await eventLogClient.closePointInTime(pitId);
    }
  }
};
