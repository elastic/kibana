/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { chunk, groupBy, concat } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { findGapsSearchAfter } from './find_gaps';
import type { Gap } from './gap';
import type { GapStatus } from '../../../common/constants';
import { gapStatus } from '../../../common/constants';

interface ProcessAllRuleGapsParams<T> {
  ruleIds: string[];
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

/**
 * Limits the number of gaps to process based on a per-rule max cap.
 *
 * @param gaps - Array of all gaps to be considered for processing.
 * @param fetchedGapsCountByRuleId - Running count of previously fetched gaps, grouped by ruleId.
 * @param maxFetchedGaps - Maximum number of gaps allowed per rule.
 * @returns An object with the limited list of gaps to process and a flag indicating if any max limits were reached.
 */
const limitGapsToProcess = (
  gaps: Gap[],
  fetchedGapsCountByRuleId: Record<string, number>,
  maxFetchedGaps: number
) => {
  let gapsToProcess = gaps;
  let maxFetchedGapsReached = false;

  const gapsByRuleId = groupBy(gaps, 'ruleId');
  const fetchedRuleIds = Object.keys(gapsByRuleId);

  // Update the running count of fetched gaps for each rule
  fetchedRuleIds.forEach((ruleId) => {
    fetchedGapsCountByRuleId[ruleId] += gapsByRuleId[ruleId].length;
  });

  // Identify which rules exceed the maxFetchedGaps limit
  const rulesReachedMaxFetchedGaps = fetchedRuleIds.filter(
    (ruleId) => fetchedGapsCountByRuleId[ruleId] > maxFetchedGaps
  );

  // If any rules exceeded the allowed limit, trim their gap lists accordingly
  if (rulesReachedMaxFetchedGaps.length > 0) {
    maxFetchedGapsReached = true;

    rulesReachedMaxFetchedGaps.forEach((ruleId) => {
      const ruleGaps = gapsByRuleId[ruleId];
      // Calculate how many excess gaps need to be removed
      const excessCount = fetchedGapsCountByRuleId[ruleId] - maxFetchedGaps;
      // Keep only the allowed number of gaps for this rule
      gapsByRuleId[ruleId] = gapsByRuleId[ruleId].slice(0, ruleGaps.length - excessCount);
    });

    gapsToProcess = concat(...Object.values(gapsByRuleId));
  }

  return { gapsToProcess, maxFetchedGapsReached };
};

export const PROCESS_GAPS_DEFAULT_PAGE_SIZE = 500;
// Circuit breaker to prevent infinite loops
// It should be enough to update 5,000,000 gaps
// 10000 * 500 = 5,000,000 million gaps
const DEFAULT_MAX_ITERATIONS = 10000;

/**
 * Fetches all gaps using search_after pagination to process more than 10,000 gaps with stable sorting
 */
export const processAllRuleGaps = async <T>({
  ruleIds,
  start,
  end,
  statuses = [gapStatus.PARTIALLY_FILLED, gapStatus.UNFILLED],
  options,
  logger,
  eventLogClient,
  processGapsBatch,
}: ProcessAllRuleGapsParams<T>): Promise<void> => {
  const processChunk = async (ruleIdsChunk: string[]) => {
    let searchAfter: SortResults[] | undefined;
    let pitId: string | undefined;
    let iterationCount = 0;

    const { maxFetchedGaps } = options ?? {};

    const fetchedGapsCountByRuleId = ruleIdsChunk.reduce((acc, ruleId) => {
      acc[ruleId] = 0;
      return acc;
    }, {} as Record<string, number>);

    let maxFetchedGapsReached = false;

    try {
      while (true) {
        if (iterationCount >= DEFAULT_MAX_ITERATIONS) {
          logger.warn(
            `Circuit breaker triggered: Reached maximum number of iterations (${DEFAULT_MAX_ITERATIONS}) while processing gaps for rules ${ruleIdsChunk.join(
              ', '
            )}`
          );
          break;
        }
        iterationCount++;

        const gapsResponse = await findGapsSearchAfter({
          eventLogClient,
          logger,
          params: {
            ruleIds: ruleIdsChunk,
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

        let gapsToProcess = gaps;

        if (maxFetchedGaps) {
          const result = limitGapsToProcess(gaps, fetchedGapsCountByRuleId, maxFetchedGaps);
          gapsToProcess = result.gapsToProcess;
          maxFetchedGapsReached = result.maxFetchedGapsReached;
        }

        if (gapsToProcess.length > 0) {
          await processGapsBatch(gapsToProcess);
        }

        // Exit conditions: no more results or no next search_after or maxFetchedGapsReached
        if (gapsToProcess.length === 0 || !nextSearchAfter || maxFetchedGapsReached) {
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

  await pMap(chunk(ruleIds, 10), processChunk, { concurrency: 10 });
};
