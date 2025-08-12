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
  countsByRuleId: Record<string, number>,
  maxProcessedGapsPerRule?: number
) => {
  const limits: Record<string, number> = {};
  if (!maxProcessedGapsPerRule) {
    return {};
  }

  Object.keys(countsByRuleId).forEach((ruleId) => {
    limits[ruleId] = maxProcessedGapsPerRule - countsByRuleId[ruleId];
  });

  return limits;
};

const getNextRuleIdsToProcess = (
  overallProcessedCountsByRuleId: Record<string, number>,
  maxProcessedGapsPerRule?: number
) => {
  if (!maxProcessedGapsPerRule) {
    return Object.keys(overallProcessedCountsByRuleId);
  }

  return Object.entries(overallProcessedCountsByRuleId)
    .filter(([_, count]) => count < maxProcessedGapsPerRule)
    .map(([ruleId]) => ruleId);
};

const PROCESS_ALL_RULE_GAPS_CONCURRENCY = 10;
const PROCESS_ALL_RULE_GAPS_CHUNK_SIZE = 10;

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
  const processChunk = async (ruleIdsToProcess: string[]) => {
    let searchAfter: SortResults[] | undefined;
    let pitId: string | undefined;
    let iterationCount = 0;

    const { maxProcessedGapsPerRule } = options ?? {};

    const overallProcessedCountsByRuleId = ruleIdsToProcess.reduce<Record<string, number>>(
      (acc, ruleId) => {
        acc[ruleId] = 0;
        return acc;
      },
      {}
    );

    try {
      while (true) {
        if (iterationCount >= DEFAULT_MAX_ITERATIONS) {
          logger.warn(
            `Circuit breaker triggered: Reached maximum number of iterations (${DEFAULT_MAX_ITERATIONS}) while processing gaps for rules ${ruleIdsToProcess.join(
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

        const {
          data: gapsToProcess,
          searchAfter: nextSearchAfter,
          pitId: nextPitId,
        } = gapsResponse;
        pitId = nextPitId;

        if (gapsToProcess.length > 0) {
          const limitsByRuleId = getProcessingLimitsByRuleId(
            overallProcessedCountsByRuleId,
            maxProcessedGapsPerRule
          );

          const processedCountsByRuleId = await processGapsBatch(gapsToProcess, limitsByRuleId);

          Object.entries(processedCountsByRuleId).forEach(([ruleId, processedCount]) => {
            overallProcessedCountsByRuleId[ruleId] += processedCount;
          });

          ruleIdsToProcess = getNextRuleIdsToProcess(
            overallProcessedCountsByRuleId,
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

  await pMap(chunk(ruleIds, PROCESS_ALL_RULE_GAPS_CHUNK_SIZE), processChunk, {
    concurrency: PROCESS_ALL_RULE_GAPS_CONCURRENCY,
  });
};
