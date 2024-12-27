/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import { findAllGaps } from '../find_gaps';
import { adHocRunStatus, gapStatus } from '../../../../common/constants';
import { Backfill } from '../../../application/backfill/result/types';
import { parseDuration } from '../../../../common';

/**
 * Find all gaps for this date range and ruleId
 * Then add inProgressIntervals to the gaps
 * Then update the gaps in the event log
 */
export const addInProgressIntervalsToGaps = async (params: {
  backfill: Backfill;
  eventLogger: IEventLogger | undefined;
  eventLogClient: IEventLogClient;
  savedObjectsRepository: ISavedObjectsRepository;
  logger: Logger;
}) => {
  const { backfill, logger, eventLogClient, eventLogger } = params;

  const ruleId = backfill.rule.id;
  const start = new Date(backfill.start);
  const end = backfill?.end ? new Date(backfill.end) : new Date();

  try {
    if (!eventLogger) {
      throw new Error('Add in-progress intervals to gaps: Event logger is not defined');
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
      // TODO: we shouldn't write gap into alertevent log if not real update
      backfill.schedule.forEach((scheduleItem) => {
        const runAt = new Date(scheduleItem.runAt).getTime();
        const intervalDuration = parseDuration(scheduleItem.interval);
        const from = runAt - intervalDuration;
        const to = runAt;
        if (
          scheduleItem.status === adHocRunStatus.PENDING ||
          scheduleItem.status === adHocRunStatus.RUNNING
        ) {
          gap.addInProgress({
            gte: new Date(from),
            lte: new Date(to),
          });
        }
      });

      const esGap = gap.getEsObject();
      const meta = gap.meta;

      if (meta) {
        try {
          await alertingEventLogger.updateGap({
            meta,
            gap: esGap,
          });
        } catch (e) {
          // TODO version mismatch ->
          // refetch gap
          // check status
          // retry

          logger.error(
            'Failed to add in-progress intervals into gap, because of conflicting versions'
          );
        }
      }
    }
  } catch (err) {
    logger.error(
      `Failed to add in-progress for rule ${ruleId} from: ${start.toISOString()} to: ${end.toISOString()}: ${
        err.message
      }`
    );
    throw err;
  }
};
