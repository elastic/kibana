/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogClient } from '@kbn/event-log-plugin/server';
import { Logger } from '@kbn/core/server';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { FindGapByIdParams } from './types';
import { Gap } from './gap';
import { transformToGap } from './transforms/transform_to_gap';

export const findGapById = async ({
  eventLogClient,
  logger,
  params,
}: {
  eventLogClient: IEventLogClient;
  logger: Logger;
  params: FindGapByIdParams;
}): Promise<Gap | null> => {
  const { gapId, ruleId } = params;
  try {
    const gapsResponse = await eventLogClient.findEventsBySavedObjectIds(
      RULE_SAVED_OBJECT_TYPE,
      [ruleId],
      {
        filter: `_id: ${gapId}`,
      }
    );

    if (gapsResponse.total === 0) return null;

    const gap = transformToGap(gapsResponse)[0];

    return gap;
  } catch (err) {
    logger.error(`Failed to find gap by id ${gapId} for rule ${ruleId.toString()}: ${err.message}`);
    throw err;
  }
};
