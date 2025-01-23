/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, ISavedObjectsRepository } from '@kbn/core/server';
import { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import { BackfillClient } from '../../../backfill_client/backfill_client';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import { findAllGaps } from '../find_gaps';
import { retryTransientEsErrors } from '../../../alerts_service/lib/retry_transient_es_errors';
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
}

const CONFLICT_STATUS_CODE = 409;

export const updateGaps = async (params: UpdateGapsParams) => {
  const { ruleId, start, end, logger } = params;
  try {
    await retryTransientEsErrors(() => _updateGaps(params), {
      logger,
      additionalRetryableStatusCodes: [CONFLICT_STATUS_CODE],
    });
  } catch (e) {
    logger.error(
      `Failed to update gaps for rule ${ruleId} from: ${start.toISOString()} to: ${end.toISOString()}: ${
        e.message
      }`
    );
  }
};

/**
 * Find all gaps for this date range and ruleId
 * Then add the filled interval to the gaps
 * Then update the gaps in the event log
 */
const _updateGaps = async (params: UpdateGapsParams) => {
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
  } = params;

  if (!eventLogger) {
    throw new Error('Event logger is required');
  }

  const alertingEventLogger = new AlertingEventLogger(eventLogger);

  const allGaps = await findAllGaps({
    eventLogClient,
    logger,
    params: {
      ruleId,
      start,
      end,
      statuses: [gapStatus.PARTIALLY_FILLED, gapStatus.UNFILLED],
    },
  });

  for (const gap of allGaps) {
    const hasFailedBackfillTask = backfillSchedule?.some(
      (scheduleItem) =>
        scheduleItem.status === adHocRunStatus.ERROR ||
        scheduleItem.status === adHocRunStatus.TIMEOUT
    );

    // add filled and in progress intervals from schedule
    if (backfillSchedule && !hasFailedBackfillTask) {
      updateGapFromSchedule({
        gap,
        backfillSchedule,
      });
    }

    // reset in progress intervals and refetch all backfills, to calculate the correct state
    // if there failed backfill task, or we remove backfill, we can't just remove in progress intervals from the gap
    // we need to refetch all backfills to calculate in-progress intervals
    if (hasFailedBackfillTask || !backfillSchedule || shouldRefetchAllBackfills) {
      await calculateGapStateFromAllBackfills({
        gap,
        savedObjectsRepository,
        ruleId,
        backfillClient,
      });
    }

    const esGap = gap.getEsObject();
    const internalFields = gap.internalFields;

    if (internalFields) {
      try {
        await alertingEventLogger.updateGap({
          internalFields,
          gap: esGap,
        });
      } catch (e) {
        if (e.statusCode === CONFLICT_STATUS_CODE) {
          logger.error('Failed to udpate gap, because of conflicting versions');
        }
        throw e;
      }
    }
  }
};
