/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { FindGapsParams, FindGapsSearchAfterParams } from './types';
import type { Gap } from './gap';
import { transformToGap } from './transforms/transform_to_gap';
import { buildGapsFilter } from './build_gaps_filter';
export const findGaps = async ({
  eventLogClient,
  logger,
  params,
}: {
  eventLogClient: IEventLogClient;
  logger: Logger;
  params: FindGapsParams;
}): Promise<{
  total: number;
  data: Gap[];
  page: number;
  perPage: number;
}> => {
  const { ruleId, start, end, page, perPage, statuses, sortField, sortOrder } = params;

  try {
    const filter = buildGapsFilter({ start, end, statuses });

    const gapsResponse = await eventLogClient.findEventsBySavedObjectIds(
      RULE_SAVED_OBJECT_TYPE,
      [ruleId],
      {
        filter,
        sort: [
          {
            sort_field: sortField ?? '@timestamp',
            sort_order: sortOrder ?? 'desc',
          },
        ],
        page,
        per_page: perPage,
      }
    );

    return {
      total: gapsResponse.total,
      data: transformToGap(gapsResponse),
      page: gapsResponse.page,
      perPage: gapsResponse.per_page,
    };
  } catch (err) {
    logger.error(`Failed to find gaps for rule ${ruleId}: ${err.message}`);
    throw err;
  }
};

/**
 * This function is used to find gaps using search after.
 * It's used when to be able process more than 10,000 gaps with stable sorting.
 */
export const findGapsSearchAfter = async ({
  eventLogClient,
  logger,
  params,
}: {
  eventLogClient: IEventLogClient;
  logger: Logger;
  params: FindGapsSearchAfterParams;
}): Promise<{
  total: number;
  data: Gap[];
  searchAfter?: SortResults[];
  pitId?: string;
}> => {
  const { ruleId, start, end, perPage, statuses, sortField, sortOrder } = params;
  try {
    const filter = buildGapsFilter({ start, end, statuses });
    const gapsResponse = await eventLogClient.findEventsBySavedObjectIdsSearchAfter(
      RULE_SAVED_OBJECT_TYPE,
      [ruleId],
      {
        filter,
        sort: [
          {
            sort_field: sortField ?? '@timestamp',
            sort_order: sortOrder ?? 'desc',
          },
        ],
        per_page: perPage,
        pit_id: params?.pitId,
        search_after: params?.searchAfter,
      }
    );

    return {
      total: gapsResponse.total,
      data: transformToGap(gapsResponse),
      searchAfter: gapsResponse.search_after as SortResults[] | undefined,
      pitId: gapsResponse.pit_id,
    };
  } catch (err) {
    logger.error(`Failed to find gaps with search after for rule ${ruleId}: ${err.message}`);
    throw err;
  }
};
