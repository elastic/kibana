/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import type { Gap } from '../gap';
import { updateGapsInEventLog } from '../update/update_gaps_in_event_log';

interface SoftDeleteGapsBatchParams {
  gaps: Gap[];
  alertingEventLogger: AlertingEventLogger;
  logger: Logger;
  eventLogClient: IEventLogClient;
}

export const softDeleteGapsBatch = async ({
  gaps,
  alertingEventLogger,
  logger,
  eventLogClient,
}: SoftDeleteGapsBatchParams): Promise<boolean> => {
  // Convert gaps to the format expected by updateDocuments
  const prepareGaps = async (gapsToUpdate: Gap[]) => {
    return gapsToUpdate
      .map((gap) => {
        if (!gap.internalFields) return null;
        return {
          gap: { ...gap.toObject(), deleted: true },
          internalFields: gap.internalFields,
        };
      })
      .filter((gap): gap is NonNullable<typeof gap> => gap !== null);
  };

  return updateGapsInEventLog({
    gaps,
    prepareGaps,
    alertingEventLogger,
    logger,
    eventLogClient,
  });
};
