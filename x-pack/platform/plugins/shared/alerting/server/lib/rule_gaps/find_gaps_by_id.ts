/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogClient } from '@kbn/event-log-plugin/server';
import { Logger } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { FindGapsByIdParams } from './types';
import { Gap } from './gap';
import { transformToGap } from './transforms/transform_to_gap';

export const findGapsById = async ({
  eventLogClient,
  logger,
  params,
}: {
  eventLogClient: IEventLogClient;
  logger: Logger;
  params: FindGapsByIdParams;
}): Promise<Gap[]> => {
  const { gapIds, ruleId, page, perPage } = params;
  try {
    const filter = gapIds.map((id) => `_id: ${id}`).join(' OR ');
    const gapsResponse = await eventLogClient.findEventsBySavedObjectIds(
      RULE_SAVED_OBJECT_TYPE,
      [ruleId],
      {
        filter,
        page,
        per_page: perPage,
      }
    );

    if (gapsResponse.total === 0) return [];

    const gaps = transformToGap(gapsResponse);

    return gaps;
  } catch (err) {
    logger.error(
      `Failed to find gaps by id ${gapIds.join(',')} for rule ${ruleId.toString()}: ${err.message}`
    );
    throw err;
  }
};
