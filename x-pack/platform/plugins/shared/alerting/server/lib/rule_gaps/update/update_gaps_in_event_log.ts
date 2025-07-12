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
import type { GapBase } from '../types';

const CONFLICT_STATUS_CODE = 409;
const MAX_RETRIES = 3;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const updateGapsInEventLog = async ({
  gaps,
  prepareGaps,
  alertingEventLogger,
  logger,
  eventLogClient,
  retryCount = 0,
}: {
  gaps: Gap[];
  prepareGaps: (gaps: Gap[]) => Promise<Array<{ gap: GapBase; internalFields: InternalFields }>>;
  alertingEventLogger: AlertingEventLogger;
  logger: Logger;
  eventLogClient: IEventLogClient;
  retryCount?: number;
}): Promise<boolean> => {
  try {
    // Prepare all gaps for update
    const gapsToUpdate = await prepareGaps(gaps);
    if (gapsToUpdate.length === 0) {
      return true;
    }

    // Attempt bulk update
    const bulkResponse = await withSpan(
      { name: 'updateGapsInEventLog.alertingEventLogger.updateGaps', type: 'rule' },
      () => alertingEventLogger.updateGaps(gapsToUpdate)
    );

    if (!bulkResponse.errors) {
      return true;
    }

    if (retryCount >= MAX_RETRIES) {
      logger.error(
        `Failed to update ${bulkResponse.items.length} gaps after ${MAX_RETRIES} retries due to conflicts`
      );
      return false;
    }
    logger.info(
      `Retrying update of ${bulkResponse.items.length} gaps due to conflicts. Retry ${
        retryCount + 1
      } of ${MAX_RETRIES}`
    );

    const retryDelaySec: number = Math.min(Math.pow(3, retryCount + 1), 30);
    await delay(retryDelaySec * 1000 * Math.random());
    const failedUpdatesDocs = bulkResponse?.items
      .filter((item) => item.update?.status === CONFLICT_STATUS_CODE)
      .map((item) => ({ _id: item.update?._id, _index: item.update?._index }))
      .filter(
        (doc): doc is { _id: string; _index: string } =>
          doc._id !== undefined && doc._index !== undefined
      );

    // Fetch latest versions of failed gaps
    const gapsToRetry = await mgetGaps({
      eventLogClient,
      logger,
      params: {
        docs: failedUpdatesDocs,
      },
    });

    if (gapsToRetry.length === 0) {
      return true;
    }

    // Retry failed gaps
    return updateGapsInEventLog({
      gaps: gapsToRetry,
      prepareGaps,
      alertingEventLogger,
      logger,
      eventLogClient,
      retryCount: retryCount + 1,
    });
  } catch (e) {
    logger.error(`Failed to update gaps in event log: ${e.message}`);
    return false;
  }
};
