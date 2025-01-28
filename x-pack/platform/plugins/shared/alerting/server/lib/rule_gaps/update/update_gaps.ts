/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, ISavedObjectsRepository } from '@kbn/core/server';
import { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { BackfillClient } from '../../../backfill_client/backfill_client';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import { findGaps } from '../find_gaps';
import { Gap } from '../gap';
import { gapStatus } from '../../../../common/constants';
import { BackfillSchedule } from '../../../application/backfill/result/types';
import { adHocRunStatus } from '../../../../common/constants';
import { calculateGapStateFromAllBackfills } from './calculate_gaps_state';
import { updateGapFromSchedule } from './update_gap_from_schedule';
import { mgetGaps } from '../mget_gaps';

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
const PAGE_SIZE = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const prepareGapForUpdate = async (
  gap: Gap,
  {
    backfillSchedule,
    savedObjectsRepository,
    shouldRefetchAllBackfills,
    backfillClient,
    actionsClient,
    ruleId,
  }: {
    backfillSchedule?: BackfillSchedule[];
    savedObjectsRepository: ISavedObjectsRepository;
    shouldRefetchAllBackfills?: boolean;
    backfillClient: BackfillClient;
    actionsClient: ActionsClient;
    ruleId: string;
  }
) => {
  const hasFailedBackfillTask = backfillSchedule?.some(
    (scheduleItem) =>
      scheduleItem.status === adHocRunStatus.ERROR || scheduleItem.status === adHocRunStatus.TIMEOUT
  );

  if (backfillSchedule && !hasFailedBackfillTask) {
    updateGapFromSchedule({
      gap,
      backfillSchedule,
    });
  }

  if (hasFailedBackfillTask || !backfillSchedule || shouldRefetchAllBackfills) {
    await calculateGapStateFromAllBackfills({
      gap,
      savedObjectsRepository,
      ruleId,
      backfillClient,
      actionsClient,
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
    const updatedGaps = [];
    for (const gap of gaps) {
      // we do async request only if there errors in backfill or no backfill schedule
      const updatedGap = await prepareGapForUpdate(gap, {
        backfillSchedule,
        savedObjectsRepository,
        shouldRefetchAllBackfills,
        backfillClient,
        actionsClient,
        ruleId,
      });
      updatedGaps.push(updatedGap);
    }

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
    const bulkResponse = await alertingEventLogger.updateGaps(gapsToUpdate);

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
 * Trying to fetch gaps in batches
 * Prepare them for update
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
    let currentPage = 1;
    let hasErrors = false;

    while (true) {
      const { data: gaps } = await findGaps({
        eventLogClient,
        logger,
        params: {
          ruleId,
          start: start.toISOString(),
          end: end.toISOString(),
          page: currentPage,
          perPage: PAGE_SIZE,
          statuses: [gapStatus.PARTIALLY_FILLED, gapStatus.UNFILLED],
        },
      });

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

      if (gaps.length === 0 || gaps.length < PAGE_SIZE) {
        break;
      }

      currentPage++;
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
