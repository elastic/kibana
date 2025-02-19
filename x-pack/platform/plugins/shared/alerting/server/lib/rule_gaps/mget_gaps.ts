/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogClient } from '@kbn/event-log-plugin/server';
import { Logger } from '@kbn/core/server';
import { Gap } from './gap';
import { transformToGap } from './transforms/transform_to_gap';

export const mgetGaps = async ({
  eventLogClient,
  logger,
  params,
}: {
  eventLogClient: IEventLogClient;
  logger: Logger;
  params: {
    docs: Array<{ _id: string; _index: string }>;
  };
}): Promise<Gap[]> => {
  try {
    const gapsResponse = await eventLogClient.findEventsByDocumentIds(params.docs);

    if (gapsResponse.data.length === 0) return [];

    const gaps = transformToGap(gapsResponse);

    return gaps;
  } catch (err) {
    logger.error(
      `Failed to mget gaps by id ${params.docs.map((doc) => doc._id).join(',')}: ${err.message}`
    );
    throw err;
  }
};
