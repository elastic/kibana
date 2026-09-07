/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { groupBy } from 'lodash';
import type { IEventLogClient, IEventLogger } from '@kbn/event-log-plugin/server';
import type { RulesClientContext } from '../../../rules_client/types';
import type { Gap } from '../gap';
import { findGapsSearchAfter } from '../find_gaps';
import { updateGapsInEventLog } from './update_gaps_in_event_log';
import { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import { getRuleIdsWithGaps } from '../../../application/gaps/methods/get_rule_ids_with_gaps/get_rule_ids_with_gaps';
import { filterGapsWithOverlappingBackfills } from '../task/utils';
import { prepareGapsForUpdate } from './utils';

const MAX_GAPS_TO_PROCESS = 1000;
const MAX_RULES_TO_PROCESS = 100;
const STUCK_GAP_THRESHOLD_HOURS = 12;

interface CleanupStuckInProgressGapsParams {
  rulesClientContext: RulesClientContext;
  eventLogClient: IEventLogClient;
  eventLogger: IEventLogger;
  logger: Logger;
  startDate: Date;
}

/**
 * Cleanup stuck in-progress gaps that don't have corresponding backfills.
 * Finds gaps with in_progress_intervals that were updated more than 12 hours ago,
 * checks if backfills exist for them, and resets the in_progress_intervals if no backfills exist.
 */
export const cleanupStuckInProgressGaps = async ({
  rulesClientContext,
  eventLogClient,
  eventLogger,
  logger,
  startDate,
}: CleanupStuckInProgressGapsParams): Promise<void> => {
  try {
    const now = new Date();
    // Calculate cutoff time: now - 12 hours
    const cutoffTime = new Date(now.getTime() - STUCK_GAP_THRESHOLD_HOURS * 60 * 60 * 1000);
    const cutoffTimeISO = cutoffTime.toISOString();

    logger.debug(
      `Starting cleanup of stuck in-progress gaps updated before ${cutoffTimeISO} (max ${MAX_GAPS_TO_PROCESS} gaps)`
    );

    // Get rule IDs with gaps that have in_progress_intervals (limit to MAX_RULES_TO_PROCESS)
    const { ruleIds: allRuleIds } = await getRuleIdsWithGaps(rulesClientContext, {
      start: startDate.toISOString(),
      end: now.toISOString(),
      hasInProgressIntervals: true,
      maxRulesToFetch: MAX_RULES_TO_PROCESS,
    });

    if (allRuleIds.length === 0) {
      logger.debug('No rules with in-progress gaps found');
      return;
    }

    logger.debug(`Processing ${allRuleIds.length} rules for stuck gap cleanup`);

    const gapsResponse = await findGapsSearchAfter({
      eventLogClient,
      logger,
      params: {
        ruleIds: allRuleIds,
        start: startDate.toISOString(),
        end: now.toISOString(),
        perPage: MAX_GAPS_TO_PROCESS,
        hasInProgressIntervals: true,
        updatedBefore: cutoffTimeISO,
        sortField: '@timestamp',
        sortOrder: 'asc',
      },
    });

    const gapsToCheck = gapsResponse.data;

    // Close PIT if it was created
    if (gapsResponse.pitId) {
      await eventLogClient.closePointInTime(gapsResponse.pitId);
    }

    if (gapsToCheck.length === 0) {
      logger.debug('No stuck in-progress gaps found');
      return;
    }

    logger.debug(`Found ${gapsToCheck.length} gaps to check for stuck in-progress intervals`);

    const gapsWithoutBackfills = await filterGapsWithOverlappingBackfills(
      gapsToCheck,
      rulesClientContext,
      (message) => logger.debug(message)
    );

    // Build a set of gaps that require reset
    const withoutBackfillsSet = gapsWithoutBackfills.reduce((acc, gap) => {
      if (gap.internalFields?._id) {
        acc.add(gap.internalFields._id);
      }
      return acc;
    }, new Set<string>());

    // Group all checked gaps by rule (we'll update all, resetting only those in withoutSet)
    const gapsByRuleId = groupBy(gapsToCheck, 'ruleId');

    // Update gaps for each rule
    const alertingEventLogger = new AlertingEventLogger(eventLogger);
    for (const [ruleId, gaps] of Object.entries(gapsByRuleId)) {
      for (const gap of gaps) {
        if (gap.internalFields?._id && withoutBackfillsSet.has(gap.internalFields._id)) {
          gap.resetInProgressIntervals();
        }
        gap.setUpdatedAt(now.toISOString());
      }

      const success = await updateGapsInEventLog({
        gaps,
        prepareGaps: async (gapsToUpdate: Gap[]) => prepareGapsForUpdate(gapsToUpdate),
        alertingEventLogger,
        logger,
        eventLogClient,
      });
      if (!success) {
        logger.warn(`Failed to update some gaps for rule ${ruleId}`);
      }
    }

    logger.info(`Successfully cleaned up ${gapsWithoutBackfills.length} stuck in-progress gaps`);
  } catch (error) {
    logger.error(`Failed to cleanup stuck in-progress gaps: ${error && error.message}`);
  }
};
