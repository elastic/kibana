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
import type { BackfillClient } from '../../../backfill_client/backfill_client';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import type { Gap } from '../gap';
import type { BackfillSchedule } from '../../../application/backfill/result/types';
import { PROCESS_GAPS_DEFAULT_PAGE_SIZE, processAllRuleGaps } from '../process_all_rule_gaps';
import { updateGapsBatch } from './update_gaps_batch';

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
        const success = await updateGapsBatch({
          gaps: fetchedGaps,
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
      await processAllRuleGaps({
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
