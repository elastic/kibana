/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import { groupBy } from 'lodash';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import type { Gap } from '../gap';
import { processAllRuleGaps } from '../process_all_rule_gaps';
import { softDeleteGapsBatch } from './soft_delete_gaps_batch';
import { gapStatus } from '../../../../common/constants';

interface SoftDeleteGapsParams {
  ruleIds: string[];
  eventLogger?: IEventLogger;
  eventLogClient: IEventLogClient;
  logger: Logger;
}

/**
 * Soft delete gaps for a given rule.
 * It orchestrates the process of searching and marking all the rule gaps as deleted
 */
export const softDeleteGaps = async (params: SoftDeleteGapsParams) => {
  const { ruleIds, logger, eventLogClient, eventLogger } = params;

  try {
    if (!eventLogger) {
      throw new Error('Event logger is required');
    }

    const alertingEventLogger = new AlertingEventLogger(eventLogger);
    let hasErrors = false;

    const processGapsBatch = async (fetchedGaps: Gap[]) => {
      const success = await softDeleteGapsBatch({
        gaps: fetchedGaps,
        alertingEventLogger,
        logger,
        eventLogClient,
      });

      if (!success) {
        hasErrors = true;
      }

      return Object.entries(groupBy(fetchedGaps, 'ruleId')).reduce<Record<string, number>>(
        (acc, [ruleId, gaps]) => {
          acc[ruleId] = gaps.length;
          return acc;
        },
        {}
      );
    };

    await processAllRuleGaps({
      ruleIds,
      logger,
      eventLogClient,
      processGapsBatch,
      statuses: Object.values(gapStatus),
    });

    if (hasErrors) {
      throw new Error('Some gaps failed to soft delete');
    }
  } catch (e) {
    logger.error(`Failed to soft delete gaps for rules ${ruleIds.join(', ')}: ${e.message}`);
  }
};
