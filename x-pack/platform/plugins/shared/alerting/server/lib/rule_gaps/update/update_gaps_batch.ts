/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ISavedObjectsRepository } from '@kbn/core/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { withSpan } from '@kbn/apm-utils';
import type { BackfillClient } from '../../../backfill_client/backfill_client';
import type { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import type { Gap } from '../gap';
import type { BackfillSchedule } from '../../../application/backfill/result/types';
import type { ScheduledItem } from './utils';
import { findOverlappingIntervals, toScheduledItem, prepareGapsForUpdate } from './utils';
import { updateGapsInEventLog } from './update_gaps_in_event_log';
import { applyScheduledBackfillsToGap } from './apply_scheduled_backfills_to_gap';
import type { BackfillInitiator } from '../../../../common/constants';

interface UpdateGapsBatchParams {
  gaps: Gap[];
  backfillSchedule?: BackfillSchedule[];
  savedObjectsRepository: ISavedObjectsRepository;
  shouldRefetchAllBackfills?: boolean;
  backfillClient: BackfillClient;
  actionsClient: ActionsClient;
  alertingEventLogger: AlertingEventLogger;
  logger: Logger;
  ruleId: string;
  eventLogClient: IEventLogClient;
  initiator: BackfillInitiator | undefined;
}

export const updateGapsBatch = async ({
  gaps,
  backfillSchedule,
  savedObjectsRepository,
  shouldRefetchAllBackfills,
  backfillClient,
  actionsClient,
  alertingEventLogger,
  logger,
  ruleId,
  eventLogClient,
  initiator,
}: UpdateGapsBatchParams): Promise<boolean> => {
  const prepareGaps = async (gapsToUpdate: Gap[]) => {
    const scheduledItems = (backfillSchedule ?? [])
      .map((backfill) => {
        try {
          return toScheduledItem(backfill);
        } catch (error) {
          logger.error(`Error processing a scheduled item while updating gaps: ${error.message}`);
          return undefined;
        }
      })
      .filter((scheduledItem): scheduledItem is ScheduledItem => scheduledItem !== undefined);
    await withSpan({ name: 'updateGaps.prepareGapsForUpdate', type: 'rule' }, async () => {
      for (const { gap, scheduled } of findOverlappingIntervals(gapsToUpdate, scheduledItems)) {
        // we do async request only if there errors in backfill or no backfill schedule
        await applyScheduledBackfillsToGap({
          gap,
          scheduledItems: scheduled,
          savedObjectsRepository,
          shouldRefetchAllBackfills,
          logger,
          backfillClient,
          actionsClient,
          ruleId,
          initiator,
        });
      }
    });
    // Set updated_at timestamp on all gaps
    const now = new Date().toISOString();
    for (const gap of gapsToUpdate) {
      gap.setUpdatedAt(now);
    }
    // Convert gaps to the format expected by updateDocuments
    return prepareGapsForUpdate(gapsToUpdate);
  };

  return updateGapsInEventLog({
    gaps,
    prepareGaps,
    eventLogClient,
    alertingEventLogger,
    logger,
  });
};
