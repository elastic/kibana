/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import { findAllGaps } from '../find_gaps';
import { gapStatus } from '../../../../common/constants';

/**
 * Find all gaps for this date range and ruleId
 * Then add the filled interval to the gaps
 * Then update the gaps in the event log
 */
export const addFilledIntervalToGaps = async (params: {
  ruleId: string;
  start: Date;
  end: Date;
  eventLogger: IEventLogger;
  eventLogClient: IEventLogClient;
  logger: Logger;
}) => {
  const { ruleId, start, end, logger, eventLogClient, eventLogger } = params;

  const alertingEventLogger = new AlertingEventLogger(eventLogger);

  try {
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
      gap.fillGap({
        gte: start,
        lte: end,
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

          logger.error('Failed to fill gap, because of conflicting versions');
        }
      }
    }
  } catch (err) {
    logger.error(
      `Failed to fill gaps for rule ${ruleId} from: ${start.toISOString()} to: ${end.toISOString()}: ${
        err.message
      }`
    );
    throw err;
  }
};
