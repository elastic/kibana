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
import { findGapById } from '../find_gap_by_id';
import { Gap } from '../gap';
import { gapStatus } from '../../../../common/constants';
import { BackfillSchedule } from '../../../application/backfill/result/types';
import { adHocRunStatus } from '../../../../common/constants';
import { calculateGapStateFromAllBackfills } from './calculate_gaps_state';
import { updateGapFromSchedule } from './update_gap_from_schedule';

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const updateSingleGap = async (
  gap: Gap,
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
  }
) => {
  let currentGap = gap;
  let retryCount = 0;

  while (retryCount <= MAX_RETRIES) {
    try {
      // If we're retrying, refetch the latest gap state
      if (retryCount > 0 && currentGap.internalFields) {
        const updatedGap = await findGapById({
          eventLogClient,
          logger,
          params: {
            gapId: currentGap.internalFields._id,
            ruleId,
          },
        });

        if (!updatedGap) {
          logger.warn(
            `Gap ${currentGap.internalFields._id} not found during retry, it was removed by another process`
          );
          return;
        }
        currentGap = updatedGap;
      }

      const hasFailedBackfillTask = backfillSchedule?.some(
        (scheduleItem) =>
          scheduleItem.status === adHocRunStatus.ERROR ||
          scheduleItem.status === adHocRunStatus.TIMEOUT
      );

      if (backfillSchedule && !hasFailedBackfillTask) {
        updateGapFromSchedule({
          gap: currentGap,
          backfillSchedule,
        });
      }

      if (hasFailedBackfillTask || !backfillSchedule || shouldRefetchAllBackfills) {
        await calculateGapStateFromAllBackfills({
          gap: currentGap,
          savedObjectsRepository,
          ruleId,
          backfillClient,
          actionsClient,
        });
      }

      const esGap = currentGap.getEsObject();
      const internalFields = currentGap.internalFields;

      if (internalFields) {
        await alertingEventLogger.updateGap({
          internalFields,
          gap: esGap,
        });
      }
      return;
    } catch (e) {
      if (e.statusCode === CONFLICT_STATUS_CODE) {
        retryCount++;
        if (retryCount > MAX_RETRIES) {
          logger.error(
            `Failed to update gap: ${currentGap?.internalFields?._id} after ${MAX_RETRIES} retries due to conflicts`
          );
          throw e;
        }
        // Use exponential backoff with some randomness: 2s, 4s, 8s
        const retryDelaySec = Math.min(Math.pow(2, retryCount), 30);
        await delay(retryDelaySec * 1000 * Math.random());
        continue;
      }
      throw e;
    }
  }
};

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
    const perPage = 10000;
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
          perPage,
          statuses: [gapStatus.PARTIALLY_FILLED, gapStatus.UNFILLED],
        },
      });

      for (const gap of gaps) {
        try {
          await updateSingleGap(gap, {
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
        } catch (e) {
          hasErrors = true;
          logger.error(`Failed to update gap: ${e.message}`);
          // Continue with other gaps even if one fails
          continue;
        }
      }

      if (gaps.length === 0 || gaps.length < perPage) {
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
