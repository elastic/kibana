/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import { withSpan } from '@kbn/apm-utils';
import type { InternalFields } from '@kbn/event-log-plugin/server/es/cluster_client_adapter';
import type { AlertingEventLogger } from '../../alerting_event_logger/alerting_event_logger';
import type { Gap } from '../gap';
import { mgetGaps } from '../mget_gaps';
import type { GapBase } from '../../../application/gaps/types';

const CONFLICT_STATUS_CODE = 409;
const MAX_RETRIES = 3;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const updateGapsInEventLog = async ({
  gaps,
  prepareGaps,
  alertingEventLogger,
  logger,
  eventLogClient,
}: {
  gaps: Gap[];
  prepareGaps: (gaps: Gap[]) => Promise<Array<{ gap: GapBase; internalFields: InternalFields }>>;
  alertingEventLogger: AlertingEventLogger;
  logger: Logger;
  eventLogClient: IEventLogClient;
}): Promise<boolean> => {
  let gapsToUpdate = gaps;
  let retryCount = 0;
  let erroredItemsCount = 0;
  try {
    while (retryCount < MAX_RETRIES) {
      if (gapsToUpdate.length === 0) {
        return true;
      }

      // Prepare all gaps for update
      const preparedGaps = await prepareGaps(gapsToUpdate);
      if (preparedGaps.length === 0) {
        return true;
      }

      // Attempt bulk update
      const bulkResponse = await withSpan(
        { name: 'updateGapsInEventLog.alertingEventLogger.updateGaps', type: 'rule' },
        () => alertingEventLogger.updateGaps(preparedGaps)
      );

      if (!bulkResponse.errors) {
        return true;
      }

      erroredItemsCount = bulkResponse.items.length;

      retryCount++;

      logger.info(
        `Retrying update of ${erroredItemsCount} gaps due to conflicts. Retry ${retryCount} of ${MAX_RETRIES}`
      );

      const maxDelaySec: number = Math.min(Math.pow(3, retryCount), 30);
      const minDelaySec = Math.pow(2, retryCount);
      const delaySec = Math.random() * (maxDelaySec - minDelaySec) + minDelaySec;
      await delay(delaySec * 1000);

      const failedUpdatesDocs = bulkResponse?.items
        .filter((item) => item.update?.status === CONFLICT_STATUS_CODE)
        .map((item) => ({ _id: item.update?._id, _index: item.update?._index }))
        .filter(
          (doc): doc is { _id: string; _index: string } =>
            doc._id !== undefined && doc._index !== undefined
        );

      // Fetch latest versions of failed gaps
      gapsToUpdate = await mgetGaps({
        eventLogClient,
        logger,
        params: {
          docs: failedUpdatesDocs,
        },
      });
    }
    logger.error(
      `Failed to update ${erroredItemsCount} gaps after ${MAX_RETRIES} retries due to conflicts`
    );
    return false;
  } catch (e) {
    logger.error(`Failed to update gaps in event log: ${e.message}`);
    return false;
  }
};
