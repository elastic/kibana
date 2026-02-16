/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { pickBy, isNumber, isEmpty } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ACTIONS_INDEX, OSQUERY_SCHEDULED_INPUT_TYPE } from '../../../common/constants';

interface ScheduledActionQuery {
  action_id: string;
  id: string;
  query: string;
  interval?: number;
  version?: string;
  platform?: string;
  timeout?: number;
}

interface CreateScheduledActionDocumentParams {
  esClient: ElasticsearchClient;
  actionId: string;
  packId: string;
  packName: string;
  queries: ScheduledActionQuery[];
  spaceId: string;
  logger: Logger;
}

export const createScheduledActionDocument = async ({
  esClient,
  actionId,
  packId,
  packName,
  queries,
  spaceId,
  logger,
}: CreateScheduledActionDocumentParams): Promise<void> => {
  try {
    if (!actionId) {
      logger.warn('No action_id provided, skipping scheduled action document creation');

      return;
    }

    const scheduledAction = {
      action_id: actionId,
      '@timestamp': moment().toISOString(),
      type: 'INPUT_ACTION',
      input_type: OSQUERY_SCHEDULED_INPUT_TYPE,
      pack_id: packId,
      pack_name: packName,
      space_id: spaceId,
      queries: queries.map((query) =>
        pickBy(
          {
            action_id: query.action_id,
            id: query.id,
            query: query.query,
            interval: query.interval,
            version: query.version,
            platform: query.platform,
            timeout: query.timeout,
          },
          (value) => !isEmpty(value) || isNumber(value)
        )
      ),
    };

    const actionsIndexExists = await esClient.indices.exists({
      index: `${ACTIONS_INDEX}*`,
    });

    if (!actionsIndexExists) {
      return;
    }

    // Only create the action document once — skip if one already exists for this action_id
    const existing = await esClient.search({
      index: `${ACTIONS_INDEX}*`,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { action_id: actionId } },
            { term: { input_type: OSQUERY_SCHEDULED_INPUT_TYPE } },
          ],
        },
      },
    });

    const totalHits =
      typeof existing.hits.total === 'number'
        ? existing.hits.total
        : existing.hits.total?.value ?? 0;

    if (totalHits > 0) {
      logger.debug(
        `Scheduled action document already exists for action_id "${actionId}", skipping`
      );

      return;
    }

    await esClient.bulk({
      refresh: 'wait_for',
      operations: [{ index: { _index: `${ACTIONS_INDEX}-${spaceId}` } }, scheduledAction],
    });
  } catch (error) {
    // Non-blocking: log errors but don't fail the pack creation/update
    logger.error(`Failed to create scheduled action document for pack "${packName}": ${error}`);
  }
};
