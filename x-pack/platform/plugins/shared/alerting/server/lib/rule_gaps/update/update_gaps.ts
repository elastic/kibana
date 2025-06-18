/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ISavedObjectsRepository } from '@kbn/core/server';
import type { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { withSpan } from '@kbn/apm-utils';
import type { BackfillClient } from '../../../backfill_client/backfill_client';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import { findGapsSearchAfter } from '../find_gaps';
import type { Gap } from '../gap';
import { gapStatus } from '../../../../common/constants';
import type { BackfillSchedule } from '../../../application/backfill/result/types';
import { adHocRunStatus } from '../../../../common/constants';
import { calculateGapStateFromAllBackfills } from './calculate_gaps_state';
import { updateGapFromSchedule } from './update_gap_from_schedule';
import { mgetGaps } from '../mget_gaps';
import type { ScheduledItem } from './utils';
import { findOverlappingIntervals, toScheduledItem } from './utils';

interface UpdateGapsParams {
  ruleId: string;
  backfillSchedule?: BackfillSchedule[];
  start: Date;
  end: Date;
  eventLogger?: IEventLogger;
  eventLogClient: IEventLogClient;
  logger: Logger;
  savedObjectsRepository: ISavedObjectsRepository;
  shouldRefetchAllBackfills?: boolean;
  backfillClient: BackfillClient;
  actionsClient: ActionsClient;
}

const CONFLICT_STATUS_CODE = 409;
const MAX_RETRIES = 3;
const PAGE_SIZE = 1000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const prepareGapForUpdate = async (
  gap: Gap,
  {
    scheduledItems,
    savedObjectsRepository,
    shouldRefetchAllBackfills,
    logger,
    backfillClient,
    actionsClient,
    ruleId,
  }: {
    scheduledItems: ScheduledItem[];
    savedObjectsRepository: ISavedObjectsRepository;
    shouldRefetchAllBackfills?: boolean;
    logger: Logger;
    backfillClient: BackfillClient;
    actionsClient: ActionsClient;
    ruleId: string;
  }
) => {
  const hasFailedBackfillTask = scheduledItems.some(
    (scheduleItem) =>
      scheduleItem.status === adHocRunStatus.ERROR || scheduleItem.status === adHocRunStatus.TIMEOUT
  );

  if (scheduledItems.length > 0 && !hasFailedBackfillTask) {
    await withSpan(
      { name: 'updateGaps.prepareGapForUpdate.updateGapFromSchedule', type: 'rules' },
      async () => {
        updateGapFromSchedule({
          gap,
          scheduledItems,
        });
      }
    );
  }

  if (hasFailedBackfillTask || scheduledItems.length === 0 || shouldRefetchAllBackfills) {
    await calculateGapStateFromAllBackfills({
      gap,
      savedObjectsRepository,
      ruleId,
      backfillClient,
      actionsClient,
      logger,
    });
  }

  return gap;
};

const updateGapBatch = async (
  gaps: Gap[],
  {
    backfillSchedule,
    savedObjectsRepository,
    shouldRefetchAllBackfills,
    backfillClient,
    actionsClient,
    alertingEventLogger,
    logger,
    ruleId,
    eventLogClient,
    retryCount = 0,
  }: {
    backfillSchedule?: BackfillSchedule[];
    savedObjectsRepository: ISavedObjectsRepository;
    shouldRefetchAllBackfills?: boolean;
    backfillClient: BackfillClient;
    actionsClient: ActionsClient;
    alertingEventLogger: AlertingEventLogger;
    logger: Logger;
    ruleId: string;
    eventLogClient: IEventLogClient;
    retryCount?: number;
  }
): Promise<boolean> => {
  try {
    // Prepare all gaps for update
    const updatedGaps: Gap[] = [];
    const scheduledItems = (backfillSchedule ?? [])
      .map((backfill) => {
        try {
          return toScheduledItem(backfill);
        } catch (error) {
          logger.error(`Error processing a scheduled item while updating gaps: ${error.message}`);
          return undefined;
        }
      })
      .filter((scheduledItem): scheduledItem is ScheduledItem => scheduledItem !== undefined);
    await withSpan({ name: 'updateGaps.prepareGapsForUpdate', type: 'rule' }, async () => {
      for (const { gap, scheduled } of findOverlappingIntervals(gaps, scheduledItems)) {
        // we do async request only if there errors in backfill or no backfill schedule
        const updatedGap = await prepareGapForUpdate(gap, {
          scheduledItems: scheduled,
          savedObjectsRepository,
          shouldRefetchAllBackfills,
          logger,
          backfillClient,
          actionsClient,
          ruleId,
        });
        updatedGaps.push(updatedGap);
      }
    });

    // Convert gaps to the format expected by updateDocuments
    const gapsToUpdate = updatedGaps
      .map((gap) => {
        if (!gap.internalFields) return null;
        return {
          gap: gap.toObject(),
          internalFields: gap.internalFields,
        };
      })
      .filter((gap): gap is NonNullable<typeof gap> => gap !== null);

    if (gapsToUpdate.length === 0) {
      return true;
    }

    // Attempt bulk update
    const bulkResponse = await withSpan(
      { name: 'updateGaps.alertingEventLogger.updateGaps', type: 'rule' },
      () => alertingEventLogger.updateGaps(gapsToUpdate)
    );

    if (bulkResponse.errors) {
      if (retryCount >= MAX_RETRIES) {
        logger.error(
          `Failed to update ${bulkResponse.items.length} gaps after ${MAX_RETRIES} retries due to conflicts`
        );
        return false;
      }
      logger.info(
        `Retrying update of ${bulkResponse.items.length} gaps due to conflicts. Retry ${
          retryCount + 1
        } of ${MAX_RETRIES}`
      );

      const retryDelaySec: number = Math.min(Math.pow(3, retryCount + 1), 30);
      await delay(retryDelaySec * 1000 * Math.random());
      const failedUpdatesDocs = bulkResponse?.items
        .filter((item) => item.update?.status === CONFLICT_STATUS_CODE)
        .map((item) => ({ _id: item.update?._id, _index: item.update?._index }))
        .filter(
          (doc): doc is { _id: string; _index: string } =>
            doc._id !== undefined && doc._index !== undefined
        );

      // Fetch latest versions of failed gaps
      const gapsToRetry = await mgetGaps({
        eventLogClient,
        logger,
        params: {
          docs: failedUpdatesDocs,
        },
      });

      if (gapsToRetry.length > 0) {
        // Retry failed gaps
        return updateGapBatch(gapsToRetry, {
          backfillSchedule,
          savedObjectsRepository,
          shouldRefetchAllBackfills,
          backfillClient,
          actionsClient,
          alertingEventLogger,
          logger,
          ruleId,
          eventLogClient,
          retryCount: retryCount + 1,
        });
      }
    }

    return true;
  } catch (e) {
    logger.error(`Failed to update gap batch: ${e.message}`);
    return false;
  }
};

/**
 * Update gaps for a given rule
 * Using search_after pagination to process more than 10,000 gaps with stable sorting
 * Prepare gaps for update
 * Update them in bulk
 * If there are conflicts, retry the failed gaps
 */
export const updateGaps = async (params: UpdateGapsParams) => {
  const {
    ruleId,
    start,
    end,
    logger,
    eventLogClient,
    eventLogger,
    backfillSchedule,
    savedObjectsRepository,
    shouldRefetchAllBackfills,
    backfillClient,
    actionsClient,
  } = params;

  if (!eventLogger) {
    throw new Error('Event logger is required');
  }

  try {
    const alertingEventLogger = new AlertingEventLogger(eventLogger);
    let hasErrors = false;
    let searchAfter: SortResults[] | undefined;
    let pitId: string | undefined;
    let iterationCount = 0;
    // Circuit breaker to prevent infinite loops
    // It should be enough to update 50,000,000 gaps
    // 100000 * 500 = 50,000,000 millions gaps
    const MAX_ITERATIONS = 100000;

    try {
      while (true) {
        if (iterationCount >= MAX_ITERATIONS) {
          logger.warn(
            `Circuit breaker triggered: Reached maximum number of iterations (${MAX_ITERATIONS}) while updating gaps for rule ${ruleId}`
          );
          break;
        }
        iterationCount++;

        const gapsResponse = await findGapsSearchAfter({
          eventLogClient,
          logger,
          params: {
            ruleId,
            start: start.toISOString(),
            end: end.toISOString(),
            perPage: PAGE_SIZE,
            statuses: [gapStatus.PARTIALLY_FILLED, gapStatus.UNFILLED],
            sortField: '@timestamp',
            sortOrder: 'asc',
            searchAfter,
            pitId,
          },
        });

        const { data: gaps, searchAfter: nextSearchAfter, pitId: nextPitId } = gapsResponse;
        pitId = nextPitId;

        if (gaps.length > 0) {
          const success = await updateGapBatch(gaps, {
            backfillSchedule,
            savedObjectsRepository,
            shouldRefetchAllBackfills,
            backfillClient,
            actionsClient,
            alertingEventLogger,
            logger,
            ruleId,
            eventLogClient,
          });

          if (!success) {
            hasErrors = true;
          }
        }

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

    if (hasErrors) {
      throw new Error('Some gaps failed to update');
    }
  } catch (e) {
    logger.error(
      `Failed to update gaps for rule ${ruleId} from: ${start.toISOString()} to: ${end.toISOString()}: ${
        e.message
      }`
    );
  }
};
