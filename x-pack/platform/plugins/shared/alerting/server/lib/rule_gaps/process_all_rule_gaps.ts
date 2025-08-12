/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { chunk } from 'lodash';
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
    maxProcessedGapsPerRule?: number;
  };
  eventLogClient: IEventLogClient;
  logger: Logger;
  processGapsBatch: (
    gaps: Gap[],
    processingLimitsByRuleId: Record<string, number>
  ) => Promise<Record<string, number>>;
}

export const PROCESS_GAPS_DEFAULT_PAGE_SIZE = 500;
// Circuit breaker to prevent infinite loops
// It should be enough to update 5,000,000 gaps
// 10000 * 500 = 5,000,000 million gaps
const DEFAULT_MAX_ITERATIONS = 10000;

const getProcessingLimitsByRuleId = (
  processedGapsCountByRuleId: Record<string, number>,
  maxProcessedGapsPerRule?: number
) => {
  const limits: Record<string, number> = {};
  if (!maxProcessedGapsPerRule) {
    return {};
  }

  Object.keys(processedGapsCountByRuleId).forEach((ruleId) => {
    limits[ruleId] = maxProcessedGapsPerRule - processedGapsCountByRuleId[ruleId];
  });

  return limits;
};

const getNextRuleIdsToProcess = (
  processedGapsCountByRuleId: Record<string, number>,
  processedGapsByRuleId: Record<string, number>,
  maxProcessedGapsPerRule?: number
) => {
  if (!maxProcessedGapsPerRule) {
    return Object.keys(processedGapsCountByRuleId);
  }

  Object.entries(processedGapsByRuleId).forEach(([ruleId, processedCount]) => {
    processedGapsCountByRuleId[ruleId] += processedCount;
  });

  return Object.entries(processedGapsCountByRuleId)
    .filter(([_, count]) => count < maxProcessedGapsPerRule)
    .map(([ruleId]) => ruleId);
};

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
    let ruleIdsToProcess = ruleIdsChunk;
    let searchAfter: SortResults[] | undefined;
    let pitId: string | undefined;
    let iterationCount = 0;

    const { maxProcessedGapsPerRule } = options ?? {};

    const processedGapsCountByRuleId = ruleIdsToProcess.reduce<Record<string, number>>((acc, ruleId) => {
      acc[ruleId] = 0;
      return acc;
    }, {});

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
            ruleIds: ruleIdsToProcess,
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

        const gapsToProcess = gaps;

        if (gapsToProcess.length > 0) {
          const processingLimitsByRuleId = getProcessingLimitsByRuleId(
            processedGapsCountByRuleId,
            maxProcessedGapsPerRule
          );

          const processedGapsByRuleId = await processGapsBatch(
            gapsToProcess,
            processingLimitsByRuleId
          );

          ruleIdsToProcess = getNextRuleIdsToProcess(
            processedGapsCountByRuleId,
            processedGapsByRuleId,
            maxProcessedGapsPerRule
          );
        }

        if (gapsToProcess.length === 0 || ruleIdsToProcess.length === 0 || !nextSearchAfter) {
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
