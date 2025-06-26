/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ISavedObjectsRepository } from '@kbn/core/server';
import type { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { chunk } from 'lodash';
import { withSpan } from '@kbn/apm-utils';
import type { BackfillClient } from '../../../backfill_client/backfill_client';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import type { Gap } from '../gap';
import type { BackfillSchedule } from '../../../application/backfill/result/types';
import { adHocRunStatus } from '../../../../common/constants';
import { calculateGapStateFromAllBackfills } from './calculate_gaps_state';
import { updateGapFromSchedule } from './update_gap_from_schedule';
import { mgetGaps } from '../mget_gaps';
import {
  PROCESS_GAPS_DEFAULT_PAGE_SIZE,
  processAllGapsInTimeRange,
} from '../process_all_gaps_in_time_range';
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
  gaps?: Gap[];
}

const CONFLICT_STATUS_CODE = 409;
const MAX_RETRIES = 3;

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
    updateGapFromSchedule({
      gap,
      scheduledItems,
    });
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
 * Prepare gaps for update
 * Update them in bulk
 * If there are conflicts, retry the failed gaps
 * If gaps are passed in, it skips fetching and process them instead
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
    gaps,
  } = params;

  if (!eventLogger) {
    throw new Error('Event logger is required');
  }

  try {
    const alertingEventLogger = new AlertingEventLogger(eventLogger);
    let hasErrors = false;

    const processGapsBatch = async (fetchedGaps: Gap[]) => {
      if (fetchedGaps.length > 0) {
        const success = await updateGapBatch(fetchedGaps, {
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
    };

    if (gaps) {
      // If the list of gaps were passed into the function, proceed to update them
      for (const gapsChunk of chunk(gaps, PROCESS_GAPS_DEFAULT_PAGE_SIZE)) {
        await processGapsBatch(gapsChunk);
      }
    } else {
      // Otherwise fetch and update them
      await processAllGapsInTimeRange({
        ruleId,
        start: start.toISOString(),
        end: end.toISOString(),
        logger,
        eventLogClient,
        processGapsBatch,
      });
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
