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
import { processAllRuleGaps } from '../process_all_rule_gaps';
import { softDeleteGapsBatch } from './soft_delete_gaps_batch';

interface SoftDeleteGapsParams {
  ruleId: string;
  eventLogger?: IEventLogger;
  eventLogClient: IEventLogClient;
  logger: Logger;
}

/**
 * Soft delete gaps for a given rule.
 * It orchestrates the process of searching and marking all the rule gaps as deleted
 */
export const softDeleteGaps = async (params: SoftDeleteGapsParams) => {
  const { ruleId, logger, eventLogClient, eventLogger } = params;

  try {
    if (!eventLogger) {
      throw new Error('Event logger is required');
    }

    const alertingEventLogger = new AlertingEventLogger(eventLogger);
    let hasErrors = false;

    const processGapsBatch = async (fetchedGaps: Gap[]) => {
      if (fetchedGaps.length > 0) {
        const success = await softDeleteGapsBatch({
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

    await processAllRuleGaps({
      ruleId,
      logger,
      eventLogClient,
      processGapsBatch,
    });

    if (hasErrors) {
      throw new Error('Some gaps failed to soft delete');
    }
  } catch (e) {
    logger.error(`Failed to soft delete gaps for rule ${ruleId}: ${e.message}`);
  }
};
