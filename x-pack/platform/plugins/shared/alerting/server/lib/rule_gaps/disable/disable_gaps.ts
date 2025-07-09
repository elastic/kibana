/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import type { Gap } from '../gap';
import { processAllGapsInTimeRange } from '../process_all_gaps_in_time_range';
import { disableGapsBatch } from './disable_gaps_batch';

interface DisableGapsParams {
  ruleId: string;
  eventLogger?: IEventLogger;
  eventLogClient: IEventLogClient;
  logger: Logger;
}

/**
 * Disable gaps for a given rule.
 * It orchestrates the process of searching and disabling all the rule gaps created in the last 90 days
 */
export const disableGaps = async (params: DisableGapsParams) => {
  const { ruleId, logger, eventLogClient, eventLogger } = params;

  if (!eventLogger) {
    throw new Error('Event logger is required');
  }

  const end = new Date();
  const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

  try {
    const alertingEventLogger = new AlertingEventLogger(eventLogger);
    let hasErrors = false;

    const processGapsBatch = async (fetchedGaps: Gap[]) => {
      if (fetchedGaps.length > 0) {
        const success = await disableGapsBatch({
          gaps: fetchedGaps,
          alertingEventLogger,
          logger,
          eventLogClient,
        });

        if (!success) {
          hasErrors = true;
        }
      }
    };

    await processAllGapsInTimeRange({
      ruleId,
      start: start.toISOString(),
      end: end.toISOString(),
      logger,
      eventLogClient,
      processGapsBatch,
    });

    if (hasErrors) {
      throw new Error('Some gaps failed to disable');
    }
  } catch (e) {
    logger.error(
      `Failed to disable gaps for rule ${ruleId} from: ${start.toISOString()} to: ${end.toISOString()}: ${
        e.message
      }`
    );
  }
};
